import{spawnSync}from'node:child_process';import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// Include new local policy/UI regressions automatically. Tests never fall back to a remote DB.
function discover(directory){return fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?discover(directory+'/'+entry.name):entry.name.endsWith('test.mjs')?[directory+'/'+entry.name]:[]);}
const tests=['test.mjs',...discover('v02').sort(),'scripts/build-test.mjs'];
for(const test of tests){const result=spawnSync(process.execPath,[test],{cwd:root,stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
console.log('PASS '+tests.length+' test programs; fictional data and loopback only.');
