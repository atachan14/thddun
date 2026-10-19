import fs from'node:fs/promises';import{pathToFileURL,fileURLToPath}from'node:url';
// Offline test engine only. No driver, env DATABASE_URL, socket or credential lookup.
export async function openTestDatabase(){const modulePath=process.env.THDMN_TEST_PGLITE_MODULE||fileURLToPath(new URL('../../../.local-test-tools/pglite/dist/index.js',import.meta.url));let PGlite;try{({PGlite}=await import(pathToFileURL(modulePath)));}catch{throw Error('Local PGlite test engine missing; see db/README.md. No remote fallback.');}const db=new PGlite();await db.waitReady;return db;}
export const sqlFile=name=>fs.readFile(new URL(name,import.meta.url),'utf8');
export function localPool(db){return{async connect(){return{query:(sql,args=[])=>db.query(sql,args),release(){}};}};}
export async function legacyFixture(db){await db.exec(await sqlFile('legacy-fixture.sql'));await db.exec(`
INSERT INTO workspaces VALUES('fixture'),('foreign-workspace');INSERT INTO workspace_revisions VALUES('fixture',5),('foreign-workspace',0);
INSERT INTO accounts VALUES('account-editor','verified-editor','Fictional editor',false),('account-reader','verified-reader','Fictional reader',false);
INSERT INTO principals(id,kind,display_name,account_id) VALUES('editor','human','Fictional editor','account-editor'),('reader','human','Fictional reader','account-reader');
INSERT INTO principal_permissions VALUES('fixture','editor','tasks:read'),('fixture','editor','tasks:write'),('fixture','reader','tasks:read'),('fixture','reader','tasks:write');
INSERT INTO spaces VALUES('account-page','fixture','account','Fictional account page'),('group-page','fixture','group','Fictional group page'),('private-page','fixture','group','Private fictional page'),('foreign-page','foreign-workspace','group','Foreign fictional page');
INSERT INTO memberships VALUES('account-page','editor'),('group-page','editor'),('account-page','reader'),('group-page','reader');
INSERT INTO tasks(id,workspace_id,owner_space_id,parent_id,name,details) SELECT 'task-'||i,'fixture','group-page',CASE WHEN i=8 THEN 'task-7' END,'Fictional Task '||i,'Fictional details '||i FROM generate_series(0,8) i;
INSERT INTO task_read_spaces SELECT id,CASE WHEN id='task-3' THEN 'private-page' ELSE 'group-page' END FROM tasks;
INSERT INTO task_policy SELECT id,'completers','editor',10 FROM tasks;
INSERT INTO task_policy VALUES('task-1','editors','editor',1),('task-7','childAdders','editor',1);
INSERT INTO task_participants VALUES('task-1','editor',10);INSERT INTO task_child_rules VALUES('task-7','completers','editor',10);INSERT INTO task_parent_tiers VALUES('task-8',10);
INSERT INTO assignee_states SELECT id,'editor',CASE WHEN id IN('task-0','task-3') THEN 'todo' ELSE 'done' END,CURRENT_TIMESTAMP,'editor' FROM tasks;
INSERT INTO task_dependencies VALUES('task-1','task-0',10),('task-2','task-3',10);
INSERT INTO task_references VALUES('reference-1','task-1','account-page',NULL),('reference-4','task-4','account-page',NULL),('private-reference','task-3','account-page',NULL);
INSERT INTO placements VALUES('placement-1','fictional-view',NULL,'reference-1',12,34);
INSERT INTO doc_references VALUES('doc-1','task-1','fictional-repo','docs/fictional.md',NULL);
INSERT INTO operations VALUES('fixture','editor','legacy-operation-1','fictional-fingerprint','{"revision":4}'),('fixture','editor','legacy-operation-2','fictional-fingerprint','{"revision":5}');
INSERT INTO audit(workspace_id,subject_id,operation_id,kind,actor_kind) VALUES('fixture','editor','legacy-operation-1','createTask','human'),('fixture','editor','legacy-operation-2','patchTask','human');`);}
export const rootManifest=Array.from({length:8},(_,i)=>({taskId:'task-'+i,pageKind:i===0?'account':'group',pageId:i===0?'account-page':'group-page'}));
export async function migrate(db,{manifest=rootManifest}={}){await setPreservationBaseline(db);await db.exec(await sqlFile('001-additive.sql'));if(manifest!==null)await db.query("SELECT set_config('thdmn.structure_root_manifest',$1,false)",[JSON.stringify(manifest)]);await db.exec(await sqlFile('002-backfill.sql'));}
// This verifier is independent of migration SQL and application model conversion.
export const protectedTables=['workspaces','workspace_revisions','accounts','principals','service_credentials','credential_workspaces','credential_actions','principal_permissions','spaces','memberships','tasks','task_read_spaces','task_policy','task_participants','task_child_rules','task_dependencies','task_parent_tiers','assignee_states','task_references','placements','doc_references','operations','audit'];
export async function captureLegacy(db){return Object.fromEntries(await Promise.all(protectedTables.map(async name=>[name,(await db.query('SELECT to_jsonb(t) AS row FROM '+name+' t ORDER BY to_jsonb(t)::text')).rows.map(x=>x.row)])));}

export async function setPreservationBaseline(db){const baseline={};for(const name of protectedTables){const r=(await db.query("SELECT count(*)::text AS count,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text) AS fingerprint FROM "+name+" t")).rows[0];baseline[name]=r;}await db.query("SELECT set_config('thdmn.structure_baseline',$1,false)",[JSON.stringify(baseline)]);return baseline;}
