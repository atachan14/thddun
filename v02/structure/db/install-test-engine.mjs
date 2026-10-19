// Explicit developer setup, never imported by test/build/runtime. No DB or auth.
import fs from'node:fs/promises';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import path from'node:path';import{spawnSync}from'node:child_process';
if(process.argv[2]!=='--install-pglite-0.5.10')throw Error('Explicit --install-pglite-0.5.10 required; registry access occurs only on this command.');
const root=fileURLToPath(new URL('../../../.local-test-tools/',import.meta.url)),dest=path.join(root,'pglite'),archive=path.join(root,'pglite-0.5.10.tgz'),staging=path.join(root,'pglite-0.5.10-unpack');
try{await fs.access(dest);throw Error('Test engine already exists; no files overwritten.');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(staging,{recursive:false}).catch(async e=>{if(e.code==='ENOENT'){await fs.mkdir(root,{recursive:true});await fs.mkdir(staging);}else throw e;});
const r=await fetch('https://registry.npmjs.org/@electric-sql/pglite/-/pglite-0.5.10.tgz',{redirect:'error'});if(!r.ok)throw Error('Registry download failed');const bytes=Buffer.from(await r.arrayBuffer()),integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');
if(integrity!=='sha512-tXc/25U3ulOkiRQuTFdwIv+JhBqtMdAF7Gvo6CfZZWtSB4+hgC4Wr2vwK5ngvvN5PJfAAEGIsfyCVy1JhCOBYw==')throw Error('Package integrity mismatch');await fs.writeFile(archive,bytes,{flag:'wx'});
const list=spawnSync('tar',['-tf',archive],{encoding:'utf8',windowsHide:true});if(list.status!==0||list.stdout.split(/\r?\n/).filter(Boolean).some(x=>!x.startsWith('package/')||x.split('/').includes('..')))throw Error('Invalid package paths');
const unpack=spawnSync('tar',['-xf',archive,'-C',staging],{stdio:'inherit',windowsHide:true});if(unpack.status!==0)throw Error('Unpack failed');await fs.rename(path.join(staging,'package'),dest);console.log('PGlite 0.5.10 installed for local synthetic SQL tests; no install scripts executed.');
