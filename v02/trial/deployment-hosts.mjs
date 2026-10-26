export const PROJECT_ID = 'prj_52ZvN8FCsa7INgMKSDhh16dMLvyP';
export const PRODUCTION_HOST = 'thdmn-aklius14pg-8355s-projects.vercel.app';
export const PRODUCTION_DOMAIN = 'thdmn.vercel.app';
export const RENAMED_PRODUCTION_HOST = 'thddun-aklius14pg-8355s-projects.vercel.app';
export const RENAMED_PRODUCTION_DOMAIN = 'thddun.vercel.app';
export const PRODUCTION_HOSTS = Object.freeze([PRODUCTION_HOST, PRODUCTION_DOMAIN, RENAMED_PRODUCTION_HOST, RENAMED_PRODUCTION_DOMAIN]);
const productionDomains = new Set([PRODUCTION_DOMAIN, RENAMED_PRODUCTION_DOMAIN]);

// This pattern validates trusted server configuration; it never matches a request
// directly. Requests must equal one of the exact strings returned below.
const projectDeployment = /^(?:thdmn|thddun)-[a-z0-9]+-aklius14pg-8355s-projects\.vercel\.app$/;
const localTestHost = /^(?:127\.0\.0\.1:[0-9]+|[a-z0-9.-]+\.invalid)$/;

export function deploymentHosts(env) {
  const deployment = env.VERCEL_URL;
  if (typeof deployment !== 'string') return null;
  if (env.VERCEL === '1' || env.VERCEL_ENV) {
    if (env.VERCEL_PROJECT_ID !== PROJECT_ID || !projectDeployment.test(deployment)) return null;
    const hosts = new Set([deployment]);
    if (env.VERCEL_ENV === 'production') {
      // Both project identity and the injected production domain must agree with
      // one of the exact old/new project aliases. Provider trusted origins are
      // configured separately; accepting a host never authenticates a request.
      if (!productionDomains.has(env.VERCEL_PROJECT_PRODUCTION_URL)) return null;
      for (const host of PRODUCTION_HOSTS) hosts.add(host);
    }
    return hosts;
  }
  // Existing synthetic/loopback tests only; real Vercel hosts never enter here.
  return localTestHost.test(deployment) ? new Set([deployment]) : null;
}
