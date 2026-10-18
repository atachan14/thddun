export const PROJECT_ID = 'prj_52ZvN8FCsa7INgMKSDhh16dMLvyP';
export const PRODUCTION_HOST = 'thdmn-aklius14pg-8355s-projects.vercel.app';

// This pattern validates trusted server configuration; it never matches a request
// directly. Requests must equal one of the exact strings returned below.
const projectDeployment = /^thdmn-[a-z0-9]+-aklius14pg-8355s-projects\.vercel\.app$/;
const localTestHost = /^(?:127\.0\.0\.1:[0-9]+|[a-z0-9.-]+\.invalid)$/;

export function deploymentHosts(env) {
  const deployment = env.VERCEL_URL;
  if (typeof deployment !== 'string') return null;
  if (env.VERCEL === '1' || env.VERCEL_ENV) {
    if (env.VERCEL_PROJECT_ID !== PROJECT_ID || !projectDeployment.test(deployment)) return null;
    const hosts = new Set([deployment]);
    if (env.VERCEL_ENV === 'production') {
      // Both project identity and the injected production domain must agree with
      // this already-assigned, already-Auth-trusted project alias.
      if (env.VERCEL_PROJECT_PRODUCTION_URL !== PRODUCTION_HOST) return null;
      hosts.add(PRODUCTION_HOST);
    }
    return hosts;
  }
  // Existing synthetic/loopback tests only; real Vercel hosts never enter here.
  return localTestHost.test(deployment) ? new Set([deployment]) : null;
}
