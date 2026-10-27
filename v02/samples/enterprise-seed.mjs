import { randomBytes, createHash } from 'node:crypto';
import { enterpriseBlueprint, SAMPLE_ROOT_ID, SAMPLE_VERSION } from './enterprise-blueprint.mjs';
import { credentialService } from '../local-auth/credential-service.mjs';
import { PolicyRepository } from '../local-auth/policy-repository.mjs';
import { loadStructure } from '../structure/db/repository.mjs';
import { validatePolicyGraph } from '../local-auth/downward-policy.mjs';
import { sampleTransaction, existingRows, assertExistingRows } from './seed-transaction.mjs';

const COMPLETE=SAMPLE_VERSION+':complete',COMPANY='sample-orion-company',PRIORITY='sample-orion-priority',DUE='sample-orion-due';
const field=(definitionId,value,required=false,forceDescendants=false)=>({definitionId,value,required,forceDescendants});
const automatic=(definitionId,forceDescendants=true)=>({definitionId,required:false,forceDescendants});
const code='ORION-PORTAL-2026';

export async function seedEnterprise(db,{localOnly=false,approvedHosted=false,workspace='fixture',ownerLoginId,onProgress=()=>{},failAfterStep=null,onSampleCredential=null}={}){
  if(!(localOnly||approvedHosted)||!db.waitReady||typeof db.exec!=='function')throw Error('Explicit local PGlite fixture required');
  const blueprint=enterpriseBlueprint(),fingerprint=createHash('sha256').update(JSON.stringify(blueprint)).digest('hex');
  await db.exec('SET search_path=thdmn_v02_trial,pg_catalog');
  if(!(await db.query("SELECT 1 FROM structure_migrations WHERE version='018-assigned-card-positions'")).rows.length)throw Error('Existing local schema must already be migrated through 018');
  const prior=(await db.query('SELECT fingerprint,response FROM operations WHERE workspace_id=$1 AND operation_id=$2',[workspace,COMPLETE])).rows;
  if(prior.length){if(prior.length!==1||prior[0].fingerprint!==fingerprint)throw Error('Sample version differs; do not overwrite');if(ownerLoginId&&ownerLoginId!==prior[0].response.ownerLoginId)throw Error('Sample owner change needs explicit review');return{...prior[0].response,replayed:true};}
  if((await db.query('SELECT 1 FROM local_auth_credentials WHERE username=$1',[SAMPLE_ROOT_ID])).rows.length)throw Error('Sample AccountID already exists without a seed marker; inspect instead of overwriting');
  const owners=approvedHosted&&!ownerLoginId?[{username:null}]:ownerLoginId?(await db.query("SELECT c.username,c.principal_id FROM local_auth_credentials c JOIN principals p ON p.id=c.principal_id JOIN accounts a ON a.id=p.account_id JOIN account_page_owners o ON o.principal_id=p.id WHERE c.username=$1 AND o.workspace_id=$2 AND NOT p.disabled AND NOT a.disabled",[ownerLoginId,workspace])).rows:(await db.query("SELECT DISTINCT c.username,c.principal_id FROM local_auth_sessions s JOIN local_auth_credentials c ON c.principal_id=s.principal_id JOIN principals p ON p.id=s.principal_id JOIN accounts a ON a.id=p.account_id JOIN account_page_owners o ON o.principal_id=p.id WHERE s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND NOT p.disabled AND NOT a.disabled AND c.username NOT LIKE 'sample_%' AND o.workspace_id=$1 AND NOT EXISTS(SELECT 1 FROM local_deleted_identities d WHERE d.principal_id=p.id)",[workspace])).rows;
  if(owners.length!==1)throw Error('Sample owner is not unambiguous; supply an explicitly chosen existing --owner AccountID');
  const owner=owners[0],before=await existingRows(db,workspace);
  const rootPassword=randomBytes(24).toString('base64url');
  const result=await sampleTransaction(db,async pool=>{
    const origin='http://127.0.0.1:8773',auth=credentialService({pool,origin,workspaceId:workspace,allowLoopbackHttp:true}),jar=new Map();let csrf;
    const authenticate=async(path,body)=>{const response=await auth.handle(new Request(origin+'/api/v02/auth/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body===undefined?{}:{'Content-Type':'application/json','X-Thdmn-CSRF':csrf||''})},...(body===undefined?{}:{body:JSON.stringify(body)})}),{address:'orion-synthetic-local-seed'});for(const c of response.headers.getSetCookie()){const item=c.split(';')[0],i=item.indexOf('=');jar.set(item.slice(0,i),item.slice(i+1));}const data=await response.json();if(data.csrf)csrf=data.csrf;return response.status;};
    await authenticate('session');if(await authenticate('register',{id:SAMPLE_ROOT_ID,password:rootPassword})!==201)throw Error('Cannot register isolated sample root');
    const rootContext=await auth.context(new Request(origin+'/api/v02/self',{headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}})),repository=new PolicyRepository(pool),rootPage=(await repository.own(rootContext,workspace)).page;
    const accountPages={root:rootPage.id},taskIds=Object.fromEntries(blueprint.tasks.map(t=>[t.key,'sample-orion-task-'+t.key])),contexts={root:rootContext};let step=0;
    const page=p=>({kind:p.kind,id:p.kind==='account'?accountPages[p.id]:taskIds[p.id]});
    const execute=async(key,command,context=rootContext)=>{const revision=Number((await db.query('SELECT revision FROM workspace_revisions WHERE workspace_id=$1',[workspace])).rows[0].revision);const result=await repository.execute(context,{workspaceId:workspace,operationId:SAMPLE_VERSION+':'+key,expectedRevision:revision,command});step++;if(step%20===0)onProgress({step});if(step===failAfterStep)throw Error('Synthetic rollback requested');return result;};
    const rootForm=required=>({type:'editAccount',accountId:rootPage.id,name:blueprint.accounts[0].name,details:blueprint.accounts[0].details,loginId:SAMPLE_ROOT_ID,password:'',policyChanges:[],policyRemovals:[],fieldEdit:{definitions:required?[]:[{id:COMPANY,name:'案件コード',type:'text'}],entries:[field(COMPANY,code,required,true),automatic('thdmn.created_at'),automatic('thdmn.last_login_at')]}});
    await execute('root-description',rootForm(false));
    for(const a of blueprint.accounts.slice(1)){
      const id='sample-orion-account-'+a.key;accountPages[a.key]=id;
      await execute('account-'+a.key,{type:'createAccountForm',id,parent:page(a.parent),name:a.name,details:a.details,loginId:a.loginId,password:randomBytes(24).toString('base64url'),policyChanges:[],policyRemovals:[],fieldEdit:{definitions:[],entries:[field(COMPANY,code),automatic('thdmn.created_at',false),automatic('thdmn.last_login_at',false)]}});
      const r=(await db.query('SELECT c.principal_id,a.external_subject FROM local_auth_credentials c JOIN principals p ON p.id=c.principal_id JOIN accounts a ON a.id=p.account_id WHERE c.username=$1',[a.loginId])).rows[0];contexts[a.key]={subjectId:r.principal_id,identitySubjectId:r.external_subject,principalKind:'human',workspaceIds:[workspace],scopes:['tasks:read','tasks:write'],csrfVerified:true};
    }
    const taskFields=(t,required=false)=>({definitions:t.key==='project'&&!required?[{id:PRIORITY,name:'優先度',type:'text'},{id:DUE,name:'締切',type:'date'}]:[],entries:[field(COMPANY,t.missingCompany?'':code),...(t.private?[]:[field(PRIORITY,t.priority,required,t.key==='project'),field(DUE,t.missingDue?'':t.due,required,t.key==='project')]),automatic('thdmn.created_at',false),automatic('thdmn.last_completed_at',false)]});
    const delayed='design-delivery-0-0';
    const createTask=async(t,context=rootContext)=>execute('task-'+t.key,{type:'createTaskForm',id:taskIds[t.key],parent:page(t.parent),patch:{name:t.name,details:t.details},policyChanges:[],assigneeAdds:t.assignees.map(k=>blueprint.accounts.find(a=>a.key===k).loginId),fieldEdit:taskFields(t)},context);
    for(const t of blueprint.tasks)if(t.key!==delayed)await createTask(t);
    for(const g of blueprint.grants)await execute('grant-'+g.page.id+'-'+g.actor,{type:'setPagePolicy',page:page(g.page),publicId:blueprint.accounts.find(a=>a.key===g.actor).loginId,permission:g.permission});
    await createTask(blueprint.tasks.find(t=>t.key===delayed),contexts.design);
    for(const t of blueprint.tasks)for(const[actor,state]of Object.entries(t.states))if(state!=='todo')await execute('state-'+t.key+'-'+actor,{type:'setMyState',taskId:taskIds[t.key],state},contexts[actor]);
    for(const d of blueprint.dependencies)await execute('dependency-'+d.taskId+'-'+d.prerequisiteTaskId,{type:'addPrerequisite',taskId:taskIds[d.taskId],prerequisiteId:taskIds[d.prerequisiteTaskId]});
    for(const r of blueprint.references){const container=page(r.container);await db.query('INSERT INTO structure_references(workspace_id,id,task_id,container_kind,container_page_id,container_task_id) VALUES($1,$2,$3,$4,$5,$6)',[workspace,'sample-orion-ref-'+r.key,taskIds[r.taskId],container.kind,container.kind==='account'?container.id:null,container.kind==='task'?container.id:null]);}
    await execute('required-company',rootForm(true));const project=blueprint.tasks.find(t=>t.key==='project');await execute('required-project',{type:'editTask',taskId:taskIds.project,patch:{details:project.details},policyChanges:[],fieldEdit:taskFields(project,true)});
    if(owner.username)await execute('owner-access',{type:'setPagePolicy',page:{kind:'account',id:rootPage.id},publicId:owner.username,permission:'manage'});
    const {model}=await loadStructure(db,workspace);const accountParents=(await db.query('SELECT account_id,parent_kind,parent_page_id,parent_task_id FROM local_account_parents WHERE workspace_id=$1',[workspace])).rows;const nodes=[...model.groups.map(x=>({...x,kind:'group'})),...model.accounts.map(x=>{const p=accountParents.find(p=>p.account_id===x.id);return{...x,kind:'account',...(p?{parent:{kind:p.parent_kind,id:p.parent_page_id||p.parent_task_id}}:{})};}),...model.tasks.map(x=>({...x,kind:'task'}))];validatePolicyGraph(nodes,model.dependencyEdges);
    const rootSnapshot=await repository.snapshot(rootContext,workspace),design=await repository.snapshot(contexts.design,workspace),aoi=await repository.snapshot(contexts.aoi,workspace),training=await repository.snapshot(contexts.training,workspace);
    if(rootSnapshot.data.tasks.filter(t=>Object.values(taskIds).includes(t.id)).length!==80)throw Error('Sample tasks incomplete');
    if(rootSnapshot.data.tasks.some(t=>!Object.values(taskIds).includes(t.id)))throw Error('Sample gained access outside its root');
    if(design.data.tasks.some(t=>t.id===taskIds['private-review'])||!aoi.data.tasks.some(t=>t.id===taskIds['private-review']&&t.permission==='manage'))throw Error('External child grant propagated upward');
    if(training.data.tasks.find(t=>t.id===taskIds.project)?.permission!=='view'||training.data.references.some(r=>r.taskId===taskIds['private-review']))throw Error('Read-only/reference target isolation failed');
    if(design.data.tasks.find(t=>t.id===taskIds[delayed])?.permission!=='manage'||design.data.tasks.find(t=>t.id===taskIds['phase-design'])?.permission!=='add')throw Error('Add-only creator default failed');
    if(rootSnapshot.data.tasks.filter(t=>t.fieldInvalid).length!==2)throw Error('Expected two deliberate required-field examples');
    if(await authenticate('logout',{})!==200)throw Error('Sample bootstrap logout failed');
    const preserved=await assertExistingRows(db,workspace,before),result={version:SAMPLE_VERSION,rootAccountId:rootPage.id,rootAccountPublicId:SAMPLE_ROOT_ID,ownerLoginId:owner.username,accounts:13,tasks:80,dependencies:57,references:5,requiredExamples:2,steps:step,preserved,accountPages,taskIds};
    await db.query('INSERT INTO operations(workspace_id,subject_id,operation_id,fingerprint,response) VALUES($1,$2,$3,$4,$5)',[workspace,rootContext.subjectId,COMPLETE,fingerprint,result]);
    return{...result,replayed:false};
  });
  onSampleCredential?.({id:SAMPLE_ROOT_ID,password:rootPassword});
  return result;
}
