import assert from'node:assert/strict';import fs from'node:fs/promises';
import{openTestDatabase,legacyFixture,migrate,localPool,captureLegacy}from'../structure/db/test-support.mjs';
import{createTrialApplication}from'../trial/application.mjs';
import{transport,prepareBatch,applyBatch}from'../cli/batch-client.mjs';
const db=await openTestDatabase();
try{
 await legacyFixture(db);await migrate(db);await db.exec(await fs.readFile(new URL('003-stage-one.sql',import.meta.url),'utf8'));
 await db.query("INSERT INTO account_page_owners(workspace_id,page_id,principal_id) VALUES('fixture','account-page','editor')");
 // Legacy child-rules determine assignment/editors; they must continue to be copied exactly.
 await db.query("INSERT INTO task_child_rules VALUES('task-7','editors','editor',3),('task-7','childAdders','editor',4)");
 const base=localPool(db),pool={connect:()=>base.connect(),async end(){}},env={NEON_AUTH_BASE_URL:'https://auth.invalid/auth',DATABASE_URL:'local-synthetic-only',VERCEL_URL:'compat.invalid'};
 const make=flag=>createTrialApplication({env:{...env,...(flag?{THDMN_STAGE_ONE:'1'}:{})},openPool:()=>pool,verifyToken:async token=>({subjectId:token==='reader-only'?'verified-reader':'verified-editor'})});
 const oldApp=make(false),app=make(true);let actor='editor';
 const request=(path,input,handler=app)=>handler(new Request('https://compat.invalid'+path,{method:input?'POST':'GET',headers:{Authorization:'Bearer '+(actor==='reader'?'reader-only':'editor-only'),...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{})}));
 const read=async()=>{const r=await request('/api/v02/snapshot?workspace=fixture');assert.equal(r.status,200,await r.clone().text());return r.json();};
 const send=async c=>{const revision=(await read()).revision;return request('/api/v02/commands',{workspaceId:'fixture',operationId:crypto.randomUUID(),expectedRevision:revision,command:c});};
 const create=(id,parentId='task-7',tier='2',deps=[])=>({type:'createTask',id,parentId,name:id,details:'existing CLI payload',deps,relationTiers:{parent:tier,deps:Object.fromEntries(deps.map(dep=>[dep,'11']))}});
 // Existing unmapped accounts see byte-equivalent legacy snapshot and structure projection.
 actor='reader';assert.deepEqual(await(await request('/api/v02/snapshot?workspace=fixture')).json(),await(await request('/api/v02/snapshot?workspace=fixture',null,oldApp)).json());
 assert.deepEqual(await(await request('/api/v02/structure/pages/account/account-page?workspace=fixture')).json(),await(await request('/api/v02/structure/pages/account/account-page?workspace=fixture',null,oldApp)).json());
 assert.equal((await send(create('denied-old-reader'))).status,403);
 await db.query("INSERT INTO task_policy VALUES('task-7','childAdders','reader',1)");assert.equal((await send(create('unmapped-old-child'))).status,200);assert.equal((await read()).stageOne,undefined);await db.query("DELETE FROM task_policy WHERE task_id='task-7' AND field='childAdders' AND principal_id='reader'");
 actor='editor';await db.query("DELETE FROM principal_permissions WHERE workspace_id='fixture' AND principal_id='editor' AND action='tasks:read'");const knownRevision=(await db.query("SELECT revision FROM workspace_revisions WHERE workspace_id='fixture'")).rows[0].revision;assert.equal((await request('/api/v02/commands',{workspaceId:'fixture',operationId:'write-only-old-operation',expectedRevision:knownRevision,command:create('write-only-old-child')})).status,200);await db.query("INSERT INTO principal_permissions VALUES('fixture','editor','tasks:read')");
 const before=await captureLegacy(db);
 assert.equal((await send(create('bad-tier-old','task-7','1'))).status,403);
 assert.equal((await send(create('bad-format-old','task-7','invalid'))).status,400);
 // Unchanged CLI compiler, transport, prepare and apply traverse actual application + SQL.
 let lose=true;const connection=transport({baseUrl:'https://compat.invalid',backend:'api-v02',token:'editor-only',workspaceId:'fixture',fetchImpl:async(url,options)=>{const r=await app(new Request(url,options));if(lose&&options?.method==='POST'){lose=false;throw Error('synthetic lost reply');}return r;}});
 const plan=await prepareBatch([{op:'create',id:'old-cli-child',parentId:'task-7',name:'旧CLI子',details:'legacy preserved',deps:[],relationTiers:{parent:'2',deps:{}}}],connection);await applyBatch(plan,connection);const replay=await applyBatch(plan,connection);assert.equal(replay[0].replayed,true);
 const policy=(await db.query("SELECT field,principal_id,tier::text FROM task_policy WHERE task_id='old-cli-child' ORDER BY field")).rows;assert.deepEqual(policy,[{field:'childAdders',principal_id:'editor',tier:'1.000000000000000000'},{field:'completers',principal_id:'editor',tier:'10.000000000000000000'},{field:'editors',principal_id:'editor',tier:'3.000000000000000000'}]);
 assert.equal((await db.query("SELECT parent_task_id FROM structure_parents WHERE task_id='old-cli-child'")).rows[0].parent_task_id,'task-7');
 assert.equal((await db.query("SELECT count(*) AS n FROM stage_task_owners WHERE task_id='old-cli-child'")).rows[0].n,0);
 assert.equal((await send({type:'patchTask',taskId:'task-0',patch:{name:'no legacy editor'}})).status,403);
 // New stage-owned root and member keep fixed collaboration semantics.
 assert.equal((await send({type:'createPageTask',id:'stage-root',parent:{kind:'account',id:'account-page'},name:'new root'})).status,200);
 assert.equal((await send({type:'createPageTask',id:'stage-source',parent:{kind:'task',id:'stage-root'},name:'source'})).status,200);
 assert.equal((await send({type:'addParticipant',taskId:'stage-root',principalId:'reader'})).status,200);
 actor='reader';assert.equal((await read()).stageOne,true);
 assert.equal((await send(create('old-payload-new-subtree','stage-root','12',['stage-source']))).status,200);
 assert.equal((await db.query("SELECT tier::text FROM task_parent_tiers WHERE task_id='old-payload-new-subtree'")).rows[0].tier,'12.000000000000000000');
 assert.equal((await db.query("SELECT prerequisite_id,tier::text FROM task_dependencies WHERE task_id='old-payload-new-subtree'")).rows[0].prerequisite_id,'stage-source');
 assert.equal((await send({type:'patchTask',taskId:'old-payload-new-subtree',patch:{details:'member edit'}})).status,200);
 assert.equal((await send({type:'addParticipant',taskId:'old-payload-new-subtree',principalId:'editor'})).status,403);
 // Participant membership must not confer rights over unrelated legacy Tasks.
 assert.equal((await send(create('still-denied-legacy'))).status,403);assert.equal((await send({type:'patchTask',taskId:'task-1',patch:{name:'no'}})).status,403);
 // Shared prerequisites cannot disclose a private source to another subtree member.
 actor='editor';await db.query("INSERT INTO memberships VALUES('private-page','editor')");assert.equal((await send(create('deny-private-source','stage-root','12',['task-3']))).status,403);await db.query("DELETE FROM memberships WHERE space_id='private-page' AND principal_id='editor'");
 assert.equal((await send(create('deny-parent-cycle','stage-root','12',['stage-root']))).status,400);
 // Legacy rows unchanged except deliberate new legacy Task, policy and audit history.
 const after=await captureLegacy(db);for(const table of ['accounts','principals','principal_permissions','memberships','service_credentials'])assert.deepEqual(after[table],before[table]);
 for(const table of ['tasks','task_policy','task_child_rules','task_participants','task_parent_tiers'])assert.deepEqual(after[table].filter(row=>!String(row.id||row.task_id).includes('old-cli-child')&&!String(row.id||row.task_id).includes('stage-')&&!String(row.id||row.task_id).includes('old-payload-new-subtree')),before[table]);
 console.log('PASS stage flag mixed compatibility: untouched unmapped snapshots/pages; mapped legacy CLI unchanged with Tier/Policy/assignment/replay; new owned subtree accepts legacy create payload with retained relation Tiers; no legacy access expansion; member edit/create but owner-only invitations. Actual local SQL, synthetic authentication only.');
}finally{await db.close();}
