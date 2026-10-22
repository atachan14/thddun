import { Pool, neonConfig } from '@neondatabase/serverless';
import { createTrialApplication } from './application.mjs';
import { deploymentHosts } from './deployment-hosts.mjs';
import { readNodeRequest, writeFetchResponse } from '../http/node-adapter.mjs';

neonConfig.webSocketConstructor = globalThis.WebSocket;

export function trialNodeHandler(env = process.env) {
  const hosts = deploymentHosts(env);
  const application = createTrialApplication({ env, openPool: connectionString => {
    const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000 });
    pool.on('error', () => {});
    return pool;
  }});
  return async (req, res) => {
    try {
      if (!hosts) {
        res.writeHead(503, { 'Cache-Control': 'no-store' });
        res.end('Trial host unavailable');
        return;
      }
      const host = req.headers.host;
      if (typeof host !== 'string' || !hosts.has(host)) {
        res.writeHead(403, { 'Cache-Control': 'no-store' });
        res.end('Origin not allowed');
        return;
      }
      // Preserve the legacy envelope rejection order: body limit precedes URL validation.
      const init = await readNodeRequest(req, res);
      if (!init) return;
      const url = new URL(req.url, 'https://' + host);
      if (url.origin !== 'https://' + host || url.username || url.password) {
        res.writeHead(403, { 'Cache-Control': 'no-store' });
        res.end('Origin not allowed');
        return;
      }
      await writeFetchResponse(res, await application(new Request(url, init)));
    } catch {
      res.writeHead(503, { 'Cache-Control': 'no-store' });
      res.end('Trial service unavailable');
    }
  };
}
export default trialNodeHandler();
