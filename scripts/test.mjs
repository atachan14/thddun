import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const tests = [
  'test.mjs', 'v02/foundation-test.mjs', 'v02/api-contract-test.mjs',
  'v02/postgres-contract-test.mjs', 'v02/principal-authorization-test.mjs',
  'v02/creation-contract-test.mjs', 'v02/creation-cli-test.mjs',
  'v02/cli/content-contract-test.mjs', 'v02/auth/auth-test.mjs',
  'v02/auth/session-test.mjs', 'v02/auth/sdk-contract-test.mjs',
  'v02/trial/application-test.mjs', 'v02/trial/node-handler-test.mjs', 'v02/trial/deployment-host-test.mjs',
  'v02/ui/create-client-test.mjs', 'v02/ui/integration-test.mjs',
  'v02/ui/safety-test.mjs', 'v02/ui/sql-review-test.mjs', 'scripts/build-test.mjs'
];
for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS ${tests.length} test programs; fictional data and loopback only.`);
