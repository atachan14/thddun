import{createHash}from'node:crypto';
import{ApiError}from'../domain-draft.mjs';
import{scope,commandInput}from'../command-contract.mjs';
import{transaction}from'../postgres-uow.mjs';
import{authorizeCurrentPrincipal}from'../principal-authorization.mjs';
import{loadStructure,structureAccess}from'../structure/db/repository.mjs';
import{projectPage,roots,validateStructure}from'../structure/contract.mjs';

const id=x=>typeof x==='string'&&x.length>0&&x.length<=160;
export function stageCommand(input){
 if(input?.command?.type==='createTask')return commandInput(input);
 if(!input||Object.keys(input).some(k=>!['workspaceId','operationId','expectedRevision','command'].includes(k))||!id(input.workspaceId)||!id(input.operationId)||input.operationId.length<8||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new ApiError(400,'Invalid operation');
 const c=input.command,fields={createPageTask:['type','id','parent','name','details'],addParticipant:['type','taskId','principalId'],patchTask:['type','taskId','patch'],setMyState:['type','taskId','state']};
 if(!c||!fields[c.type]||Object.keys(c).some(k=>!fields[c.type].includes(k)))throw new ApiError(400,'Invalid command');
 if(c.type==='createPageTask'&&(!id(c.id)||!c.parent||!['account','task'].includes(c.parent.kind)||!id(c.parent.id)||Object.keys(c.parent).some(k=>!['kind','id'].includes(k))||typeof c.name!=='string'||!c.name.trim()||c.name.length>160||typeof(c.details??'')!=='string'||(c.details||'').length>10000))throw new ApiError(400,'Invalid task');
 if(c.type!=='createPageTask'&&!id(c.taskId))throw new ApiError(400,'Invalid task');
 if(c.type==='addParticipant'&&!id(c.principalId))throw new ApiError(400,'Invalid principal');
 if(c.type==='patchTask'&&(!c.patch||!Object.keys(c.patch).length||Object.keys(c.patch).some(k=>!['name','details'].includes(k))||Object.entries(c.patch).some(([k,v])=>typeof v!=='string'||v.length>(k==='name'?160:10000)||k==='name'&&!v.trim())))throw new ApiError(400,'Invalid content');
 if(c.type==='setMyState'&&!['todo','doing','hold','done'].includes(c.state))throw new ApiError(400,'Invalid state');return input;
}
export function stageAccess(data,model,context,owners,members,accounts){
 const legacy=structureAccess(data,model,context),chain=id=>{const found=[],seen=new Set();for(let t=model.tasks.find(t=>t.id===id);t&&!seen.has(t.id);t=t.parent.kind==='task'?model.tasks.find(x=>x.id===t.parent.id):null){seen.add(t.id);found.push(t.id);}return found;};
 const owned=id=>chain(id).some(t=>owners.some(o=>o.task_id===t&&o.principal_id===context.subjectId));
 const collaborate=id=>owned(id)||chain(id).some(t=>members.some(m=>m.task_id===t&&m.principal_id===context.subjectId));
 const managed=id=>chain(id).some(t=>owners.some(o=>o.task_id===t));
 const read=id=>!!model.tasks.find(t=>t.id===id)&&(managed(id)?collaborate(id):collaborate(id)||legacy.canReadTask(context,id));
 return{owned,collaborate,managed,canReadTask:(_,id)=>read(id),canReadPage:(_,p)=>p.kind==='task'?read(p.id):p.kind==='account'?accounts.some(a=>a.page_id===p.id&&a.principal_id===context.subjectId):legacy.canReadPage(context,p),canEditTask:(_,id)=>read(id)&&(collaborate(id)||legacy.canEditTask(context,id)),canShareDependency:()=>false};
}
export class StageRepository{
 constructor(pool){this.pool=pool;}
 async unit(context,workspace,action,fn){scope(context,workspace,action);return transaction(this.pool,async client=>{await authorizeCurrentPrincipal(client,context,workspace,action);const meta=await client.query('SELECT revision FROM workspace_revisions WHERE workspace_id=$1'+(action==='tasks:write'?' FOR UPDATE':''),[workspace]);if(!meta.rows.length)throw new ApiError(404,'Not found');if(!Number.isSafeInteger(Number(meta.rows[0].revision)))throw new ApiError(503,'Revision out of range');const {model,data}=await loadStructure(client,workspace);const rows=async table=>(await client.query('SELECT * FROM '+table+' WHERE workspace_id=$1',[workspace])).rows;const owners=await rows('stage_task_owners'),members=await rows('stage_task_members'),accounts=await rows('account_page_owners');return fn(client,{model,data,owners,members,accounts,access:stageAccess(data,model,context,owners,members,accounts),revision:Number(meta.rows[0].revision)});});}
 async enabled(context,workspace){return this.unit(context,workspace,'tasks:read',async(_,s)=>[...s.accounts,...s.owners,...s.members].some(x=>x.principal_id===context.subjectId));}
 async executeCompatible(context,input,legacy){
  if(['createTask','patchTask','setMyState'].includes(input?.command?.type)){commandInput(input);const target=input.command.type==='createTask'?input.command.parentId:input.command.taskId;const managed=await this.unit(context,input.workspaceId,'tasks:write',async(_,s)=>s.access.managed(target));if(!managed)return legacy.execute(context,input);}
  return this.execute(context,input);
 }
 async own(context,workspace){return this.unit(context,workspace,'tasks:read',async(_,s)=>{const row=s.accounts.find(a=>a.principal_id===context.subjectId);if(!row)return{page:null,workspaceId:workspace};const p=s.model.accounts.find(p=>p.id===row.page_id);if(!p)throw new ApiError(503,'Account unavailable');return{workspaceId:workspace,page:{kind:'account',...p}};});}
 async read(context,workspace,target){return this.unit(context,workspace,'tasks:read',async(_,s)=>{s.model.revision=s.revision;return target?projectPage(s.model,context,target,s.access):{revision:s.revision,pages:roots(s.model,context,s.access)};});}
 async snapshot(context,workspace){return this.unit(context,workspace,'tasks:read',async(_,s)=>{const visible=s.data.tasks.filter(t=>s.access.canReadTask(context,t.id)),ids=new Set(visible.map(t=>t.id));const projected=visible.map(t=>{const parent=s.model.tasks.find(x=>x.id===t.id).parent;return{id:t.id,title:t.title,details:t.details,parentId:parent.kind==='task'&&ids.has(parent.id)?parent.id:null,parentPage:s.access.canReadPage(context,parent)?parent:null,stageManaged:s.access.managed(t.id),sharedRoot:parent.kind==='account'&&!s.access.canReadPage(context,parent)&&s.access.collaborate(t.id),assignees:t.assignees,workStates:t.workStates,prerequisiteIds:t.prerequisiteIds.filter(x=>ids.has(x)),capabilities:{editContent:s.access.canEditTask(context,t.id),createChild:s.access.collaborate(t.id)||t.childAdders?.[context.subjectId]!==undefined,manageParticipants:s.access.owned(t.id)},completion:projectPage(s.model,context,{kind:'task',id:t.id},s.access).pageTask.completion,readiness:projectPage(s.model,context,{kind:'task',id:t.id},s.access).pageTask.readiness};});return{revision:s.revision,actorPrincipalId:context.subjectId,stageOne:true,data:{tasks:projected,users:s.data.users.filter(u=>u.id===context.subjectId||visible.some(t=>t.assignees.includes(u.id))),references:s.model.references.filter(r=>ids.has(r.taskId)&&s.access.canReadPage(context,r.container)),placements:[],docs:s.data.docs.filter(d=>ids.has(d.taskId))}};});}
 async execute(context,input){stageCommand(input);try{return await this.unit(context,input.workspaceId,'tasks:write',async(client,s)=>{
 const {workspaceId:w,operationId:op,expectedRevision,command:c}=input;const creating=['createPageTask','createTask'].includes(c.type),parentPage=c.type==='createTask'?{kind:'task',id:c.parentId}:c.parent;
 if(c.type==='createTask'&&!s.access.managed(c.parentId))throw new ApiError(400,'Legacy creation requires the compatible route');
 if(creating){
  if(parentPage.kind==='task'&&!s.access.managed(parentPage.id))throw new ApiError(400,'Legacy Task requires explicit Tier creation');
  if(!s.access.canReadPage(context,parentPage))throw new ApiError(404,'Not found');
  if(parentPage.kind==='account'?!s.accounts.some(a=>a.page_id===parentPage.id&&a.principal_id===context.subjectId):!s.access.collaborate(parentPage.id)&&s.data.tasks.find(t=>t.id===parentPage.id)?.childAdders?.[context.subjectId]===undefined)throw new ApiError(403,'Not child creator');
 }else{
  if(!s.access.canReadTask(context,c.taskId))throw new ApiError(404,'Not found');
  if(c.type==='addParticipant'&&!s.access.owned(c.taskId))throw new ApiError(403,'Owner required');
  if(c.type==='patchTask'&&!s.access.canEditTask(context,c.taskId))throw new ApiError(403,'Not editor');
  if(c.type==='setMyState'&&!s.data.tasks.find(t=>t.id===c.taskId).assignees.includes(context.subjectId))throw new ApiError(403,'Not assigned');
 }
 const fingerprint=createHash('sha256').update(JSON.stringify(c)).digest('hex'),prior=(await client.query('SELECT fingerprint,response FROM operations WHERE workspace_id=$1 AND subject_id=$2 AND operation_id=$3',[w,context.subjectId,op])).rows[0];if(prior){if(prior.fingerprint!==fingerprint)throw new ApiError(409,'Operation ID reused');return{...prior.response,replayed:true};}
 if(expectedRevision!==s.revision)throw new ApiError(409,'Revision conflict');
 if(creating){
  const parent=parentPage.kind==='task'?s.data.tasks.find(t=>t.id===parentPage.id):null;
  const deps=c.type==='createTask'?(c.deps||[]):[];
  for(const dep of deps){if(!s.access.canReadTask(context,dep))throw new ApiError(404,'Not found');const audience=new Set([...s.owners,...s.members].map(x=>x.principal_id));for(const principal of audience){const access=stageAccess(s.data,s.model,{...context,subjectId:principal},s.owners,s.members,s.accounts);if(access.collaborate(parent.id)&&!access.canReadTask(context,dep))throw new ApiError(403,'Prerequisite is not readable by the subtree audience');}}
  if(s.data.tasks.some(t=>t.id===c.id))throw new ApiError(409,'Task ID exists');
  try{validateStructure({...s.model,tasks:[...s.model.tasks,{id:c.id,title:c.name,parent:parentPage,assignees:[],workStates:{}}],dependencyEdges:[...s.model.dependencyEdges,...deps.map(dep=>({id:'stage-dependency:'+c.id+':'+dep,taskId:c.id,prerequisiteTaskId:dep}))]});}catch(e){throw new ApiError(e.status||400,'Invalid task relations');}
  await client.query('INSERT INTO tasks(id,workspace_id,owner_space_id,parent_id,name,details) VALUES($1,$2,$3,$4,$5,$6)',[c.id,w,parent?.ownerGroupId||parentPage.id,parent?.id||null,c.name,c.details||'']);
  await client.query('INSERT INTO structure_parents(workspace_id,task_id,parent_kind,parent_page_id,parent_task_id) VALUES($1,$2,$3,$4,$5)',[w,c.id,parentPage.kind,parent?null:parentPage.id,parent?.id||null]);
  if(c.type==='createTask'){await client.query('INSERT INTO task_parent_tiers(task_id,tier) VALUES($1,$2)',[c.id,c.relationTiers.parent]);for(const dep of deps)await client.query('INSERT INTO task_dependencies(task_id,prerequisite_id,tier) VALUES($1,$2,$3)',[c.id,dep,c.relationTiers.deps[dep]]);}
  // A descendant keeps the existing subtree owner. Its creator cannot acquire invitation rights.
  if(!parent)await client.query('INSERT INTO stage_task_owners VALUES($1,$2,$3)',[w,c.id,context.subjectId]);
  else if(!s.access.collaborate(parent.id)){
   // Legacy Tasks have no explicit owner mapping: do not infer one from editor/Tier.
   await client.query('INSERT INTO stage_task_members VALUES($1,$2,$3)',[w,c.id,context.subjectId]);
  }
 }else if(c.type==='addParticipant'){
  const p=(await client.query("SELECT p.id FROM principals p LEFT JOIN accounts a ON a.id=p.account_id LEFT JOIN accounts o ON o.id=p.owner_account_id WHERE p.id=$1 AND p.disabled=false AND ((p.kind='human' AND a.disabled=false) OR (p.kind='service' AND o.disabled=false)) AND EXISTS(SELECT 1 FROM principal_permissions x WHERE x.principal_id=p.id AND x.workspace_id=$2 AND x.action='tasks:read')",[c.principalId,w])).rows[0];if(!p)throw new ApiError(404,'Not found');
  await client.query('INSERT INTO stage_task_members VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[w,c.taskId,c.principalId]);
 }else if(c.type==='patchTask')await client.query('UPDATE tasks SET name=CASE WHEN $3 THEN $4 ELSE name END,details=CASE WHEN $5 THEN $6 ELSE details END WHERE id=$1 AND workspace_id=$2',[c.taskId,w,Object.hasOwn(c.patch,'name'),c.patch.name||'',Object.hasOwn(c.patch,'details'),c.patch.details||'']);
 else await client.query('INSERT INTO assignee_states(task_id,principal_id,state,changed_at,changed_by) VALUES($1,$2,$3,CURRENT_TIMESTAMP,$2) ON CONFLICT(task_id,principal_id) DO UPDATE SET state=EXCLUDED.state,changed_at=EXCLUDED.changed_at,changed_by=EXCLUDED.changed_by',[c.taskId,context.subjectId,c.state]);
 const response={revision:s.revision+1,operationId:op};await client.query('UPDATE workspace_revisions SET revision=revision+1 WHERE workspace_id=$1',[w]);await client.query('INSERT INTO operations(workspace_id,subject_id,operation_id,fingerprint,response) VALUES($1,$2,$3,$4,$5)',[w,context.subjectId,op,fingerprint,response]);await client.query('INSERT INTO audit(workspace_id,subject_id,operation_id,kind,actor_kind,credential_id,managing_account_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[w,context.subjectId,op,c.type,context.principalKind||'human',context.credentialId||null,context.ownerAccountId||null]);return response;
 });}catch(e){if(['23505','40001','40P01'].includes(e.code))throw new ApiError(409,'Concurrent update or ID conflict');throw e;}}
}
