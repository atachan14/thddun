import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
for(const name of ['migration-test.mjs','api-test.mjs','release-test.mjs']){const result=spawnSync(process.execPath,[fileURLToPath(new URL(name,import.meta.url))],{stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
console.log('PASS 3 independent local PostgreSQL programs. Synthetic data only; no remote database/auth/credentials.');
