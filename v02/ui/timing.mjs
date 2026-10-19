// Fixed stage names and numeric durations only. No payloads, identities, URLs or tokens.
const stages = new Set(['environment', 'auth-sdk', 'session', 'token', 'snapshot', 'render']);
export async function timed(stage, work) {
 if (!stages.has(stage)) throw Error('Unknown timing stage');
 const start = performance.now();
 try { return await work(); }
 finally {
  const name = 'thdmn:' + stage;
  performance.clearMeasures(name);
  performance.measure(name, { start, end: performance.now() });
 }
}
