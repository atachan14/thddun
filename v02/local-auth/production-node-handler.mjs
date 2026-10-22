import { Pool, neonConfig } from '@neondatabase/serverless';
import { isIP } from 'node:net';
import { trialNodeHandler } from '../trial/node-handler.mjs';
import { deploymentHosts } from '../trial/deployment-hosts.mjs';
import { readNodeRequest, writeFetchResponse } from '../http/node-adapter.mjs';
import { createPasswordApplication, PASSWORD_API_PREFIX } from './production-application.mjs';

neonConfig.webSocketConstructor = globalThis.WebSocket;

export function productionAddress(req, env) {
  const value = env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
  return typeof value === 'string' && isIP(value) ? value : 'unknown';
}

export function productionNodeHandler(env = process.env, {
  openPool = connectionString => {
    const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000 });
    pool.on('error', () => {});
    return pool;
  },
  legacy = trialNodeHandler(env),
} = {}) {
  const hosts = deploymentHosts(env);
  const application = createPasswordApplication({ env, openPool });
  return async (req, res) => {
    const host = req.headers.host;
    if (typeof host !== 'string' || !hosts?.has(host)) {
      res.writeHead(403, { 'Cache-Control': 'no-store' }).end('Origin not allowed');
      return;
    }
    let url;
    try {
      url = new URL(req.url, 'https://' + host);
      if (url.origin !== 'https://' + host || url.username || url.password) throw Error();
    } catch {
      res.writeHead(403).end();
      return;
    }
    if (!url.pathname.startsWith(PASSWORD_API_PREFIX + '/')) return legacy(req, res);
    try {
      const init = await readNodeRequest(req, res);
      if (init) await writeFetchResponse(res, await application(new Request(url, init), {
        address: productionAddress(req, env),
      }));
    } catch {
      res.writeHead(503, { 'Cache-Control': 'no-store' }).end('Application unavailable');
    }
  };
}
export default productionNodeHandler();
