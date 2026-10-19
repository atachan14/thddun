import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fakePool } from '../fake-postgres-pool.mjs';
import { PostgresRepository } from '../postgres-repository.mjs';
import { createApi } from '../api-handler.mjs';
import { transport, prepareBatch, applyBatch } from './batch-client.mjs';
import { readiness } from './readiness.mjs';

const pool=fakePool(),context={subjectId:'dev',workspaceIds:['demo'],scopes:['tasks:read','tasks:write'],csrfVerified:true};
for(const t of pool.state.data.tasks){t.editors={};t.childAdders={};}
const repository=new PostgresRepository(pool,{authorizePrincipal:async()=>{}}),read=repository.snapshot.bind(repository);
repository.snapshot=async(...args)=>({...await read(...args),actorPrincipalId:'dev'});
const api=createApi({repository,authenticate:async r=>r.headers.get('authorization')==='Bearer synthetic-readiness-only'?context:null});
let gets=0,posts=0;
const server=http.createServer(async(req,res)=>{if(req.method==='POST')posts++;else gets++;const chunks=[];for await(const c of req)chunks.push(c);const response=await api(new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const root=fileURLToPath(new URL('../..',import.meta.url)),dir=await fs.mkdtemp(path.join(os.tmpdir(),'thdmn-readiness-')),url='http://127.0.0.1:'+server.address().port;
const run=args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['v02/cli/main.mjs',...args],{cwd:root,windowsHide:true,env:{...process.env,THDMN_CALLER_TOKEN:'synthetic-readiness-only'}});let out='',err='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>err+=c);child.on('error',reject);child.on('exit',code=>resolve({code,out,err}));});
try{
 const before=structuredClone(pool.state),check=await run(['check','--url',url,'--backend','api-v02']);
 assert.equal(check.code,0,check.err);const info=JSON.parse(check.out);
 assert.equal(info.visibleTasks,5);assert.deepEqual(info.createParentIds,[]);assert.deepEqual(info.editableTaskIds,[]);assert(info.ownStateTaskIds.includes('build'));assert(!check.out.includes('title'));assert(!check.out.includes('buyer-secret'));assert.equal(posts,0);assert.equal(gets,1);assert.deepEqual(pool.state,before);
 const input=path.join(dir,'input.json'),journal=path.join(dir,'plan.json');
 await fs.writeFile(input,JSON.stringify([{op:'edit',taskId:'build',details:'synthetic edit'}]));
 const prepared=await run(['prepare',input,'--journal',journal,'--url',url,'--backend','api-v02']);assert.equal(prepared.code,0,prepared.err);assert.equal(posts,0);
 const bytes=await fs.readFile(journal,'utf8');assert(!bytes.includes('synthetic-readiness-only'));
 const refused=await run(['apply',journal]);assert.equal(refused.code,1);assert.equal(JSON.parse(refused.err).status,403);assert.deepEqual(pool.state,before);
 const duplicate=await run(['prepare',input,'--journal',journal,'--url',url,'--backend','api-v02']);assert.equal(duplicate.code,1);assert.equal(await fs.readFile(journal,'utf8'),bytes);
 const conn=transport({baseUrl:url,backend:'api-v02',token:'synthetic-readiness-only'});
 pool.state.data.tasks.find(t=>t.id==='build').editors.dev='1';
 const a=await prepareBatch([{op:'edit',taskId:'build',details:'newer'}],conn),b=await prepareBatch([{op:'edit',taskId:'build',details:'stale'}],conn);
 await applyBatch(a,conn);const after=structuredClone(pool.state);await assert.rejects(applyBatch(b,conn),e=>e.status===409&&e.completed.length===0);assert.deepEqual(pool.state,after);
 const tampered=structuredClone(a);tampered.items.push({operationId:'tampered-second',expectedRevision:2,command:{type:'patchTask',taskId:'build',patch:{policy:{}}}});
 const count=posts;await assert.rejects(applyBatch(tampered,conn));assert.equal(posts,count);
 const invalidInput=[{op:'create',parentId:'brief',name:'x'.repeat(161),relationTiers:{parent:'2',deps:{}}}];const reads=gets;await assert.rejects(prepareBatch(invalidInput,conn));assert.equal(gets,reads);
 const html=transport({baseUrl:'https://synthetic.invalid',backend:'api-v02',token:'synthetic',fetchImpl:async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})});await assert.rejects(html.read(),/Expected API JSON/);
 assert.deepEqual(readiness({revision:1,data:{tasks:[]}}).createParentIds,[]);
 console.log('PASS CLI read-only readiness, prepare GET-only, no token journal, journal no-overwrite, real process 403, stale409 unchanged, malformed whole-plan blocked before POST, input validation before GET, protection HTML detected. Synthetic PG/loopback only.');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
