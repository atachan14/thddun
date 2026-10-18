import{validateWork,migrateWork,stateOf,changeWork,aggregateWork}from'./work-states.mjs';
import{validateRelations,guardRelations}from'./relations.mjs';
import{validateRules,guardRules,independentCopy,generatedTaskPolicy,bulkPlan}from'./independent.mjs';
import{validateTiers,guardTierChanges,buildTierPlan,canonicalTier,checkItemChange}from'./tier.mjs';
import{validate as validateLegacy}from'./model.mjs';
import{migrateFavorites}from'./favorites.mjs';
export const fields=['childAdders','editors','completers'];
export class DomainError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status)=>{throw new DomainError(message,status);};
const list=(value)=>Array.isArray(value)&&value.every(x=>typeof x==='string')&&new Set(value).size===value.length;
export function validateLedger(d){
 if(!d||d.version!==2||!Array.isArray(d.tasks)||!d.tasks.length||!Array.isArray(d.principals)||!d.principals.length||!d.users?.sample||!Array.isArray(d.audit)||!Array.isArray(d.forcedGrants))fail('台帳形式が不正です');
 const people=new Set(d.principals.map(p=>p.id)),ids=new Set(d.tasks.map(t=>t.id));if(people.size!==d.principals.length||ids.size!==d.tasks.length)fail('IDが重複しています');
 if(d.principals.some(p=>typeof p.id!=='string'||!p.id||['__proto__','constructor','prototype'].includes(p.id)||typeof p.name!=='string')||Object.values(d.users).some(u=>!u||!Array.isArray(u.favorites)||u.favorites.some(f=>typeof f?.taskId!=='string')||new Set(u.favorites.map(f=>f.taskId)).size!==u.favorites.length))fail('利用者またはお気入りが不正です');
 for(const t of d.tasks){if(typeof t.id!=='string'||!t.id||(t.details!==undefined&&(typeof t.details!=='string'||t.details.length>10000))||typeof t.name!=='string'||!t.name.trim()||t.name.length>160||t.parent!==null&&!ids.has(t.parent)||!list(t.deps)||t.deps.some(id=>!ids.has(id))||!d.assigneeStates&&!['todo','doing','hold','waiting'].includes(t.progressState)||!['todo','doing','hold','waiting','done'].includes(t.state)||!t.policy||!['inherit','custom'].includes(t.policy.mode)||!d.assigneeStates&&(!t.completionMarks||typeof t.completionMarks!=='object'||Array.isArray(t.completionMarks))||!t.customFields||typeof t.customFields!=='object'||Array.isArray(t.customFields))fail('Task形式が不正です');
  if(t.policy.mode==='inherit'&&!t.parent)fail('親なしTaskは個別Policyが必要です');
  if(t.policy.mode==='custom'&&fields.some(k=>!list(t.policy.values?.[k])||t.policy.values[k].some(id=>!people.has(id))))fail('Policyの利用者が不正です');
  for(const[id,mark]of Object.entries(t.completionMarks||{}))if(!people.has(id)||typeof mark.done!=='boolean'||!Number.isFinite(Date.parse(mark.at)))fail('完了印が不正です');
 }
 for(const relation of ['parent','deps']){const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))fail(relation==='parent'?'親子・継承が循環しています':'前提が循環しています');if(done.has(id))return;visiting.add(id);const t=d.tasks.find(x=>x.id===id);for(const next of relation==='parent'?(t.parent?[t.parent]:[]):t.deps)visit(next);visiting.delete(id);done.add(id);}for(const id of ids)visit(id);}
 const grantIds=new Set();for(const g of d.forcedGrants){if(typeof g.id!=='string'||!g.id||grantIds.has(g.id)||!ids.has(g.sourceTaskId)||!people.has(g.userId)||!fields.includes(g.field)||g.propagation!=='descendants')fail('強制設定の由来が不正です');grantIds.add(g.id);}
 if(d.independentItems)for(const t of d.tasks){if(t.policy.mode!=='custom')fail('各Taskは独立Policyが必要です');validateRules(d,t.childRules);}validateTiers(d,fields);validateRelations(d);validateWork(d);return d;
}
export function effectivePolicy(d,id){
 const chain=[];for(let t=d.tasks.find(t=>t.id===id);t;t=d.tasks.find(x=>x.id===t.parent))chain.unshift(t);
 if(!chain.length)fail('Taskがありません',404);const nearest=[...chain].reverse().find(t=>t.policy.mode==='custom');if(!nearest)fail('継承元Policyがありません');
 const values=Object.fromEntries(fields.map(k=>[k,[...nearest.policy.values[k]]])),grants=[];
 for(const field of fields)for(const userId of values[field])grants.push({kind:nearest.id===id?'custom':'inherited',sourceTaskId:nearest.id,field,userId,path:chain.slice(chain.findIndex(t=>t.id===nearest.id)).map(t=>t.id)});
 for(const grant of d.forcedGrants){const index=chain.findIndex(t=>t.id===grant.sourceTaskId);if(index<0)continue;if(!values[grant.field].includes(grant.userId))values[grant.field].push(grant.userId);grants.push({...grant,kind:'forced',path:chain.slice(index).map(t=>t.id)});}
 const itemTiers=d.tierProtection?Object.fromEntries(fields.map(field=>[field,{...nearest.policy.tiers[field]}])):null;if(itemTiers)for(const grant of grants)grant.tier=itemTiers[grant.field][grant.userId];return{...values,grants,itemTiers};
}
export function recompute(d){
 const done=new Set();function update(t){if(done.has(t.id))return;const kids=d.tasks.filter(x=>x.parent===t.id);kids.forEach(update);const required=effectivePolicy(d,t.id).completers;t.state=d.assigneeStates?aggregateWork(t,kids,required):required.length>0&&required.every(id=>t.completionMarks[id]?.done)&&kids.every(k=>k.state==='done')?'done':t.progressState;done.add(t.id);}d.tasks.forEach(update);return d;
}
export function upgradeLegacy(input,actorId){
 validateLegacy(input);const original=structuredClone(input),migrated=migrateFavorites(input).data;
 const people=new Map([['sample','サンプルUser'],['human','人間'],['ai','AI'],['team','チーム'],['dot','dot'],...Object.keys(migrated.users).map(id=>[id,id==='sample'?'サンプルUser':id])]);if(!people.has(actorId))fail('移行するローカル利用者を選んでください');
 const d={...structuredClone(migrated),version:2,principals:[...people].map(([id,name])=>({id,name})),forcedGrants:[],audit:[],migration:{sourceVersion:1,original},tasks:migrated.tasks.map(t=>{
  const next={...t,progressState:t.state==='done'?'todo':t.state,state:t.state==='done'?'todo':t.state,policy:t.parent?{mode:'inherit'}:{mode:'custom',values:{childAdders:[actorId],editors:[actorId],completers:[]}},completionMarks:{},customFields:t.customFields||{},legacy:{...(t.legacy||{}),state:t.state,assignee:t.assignee,eligible:t.eligible}};delete next.assignee;delete next.eligible;return next;
 })};for(const{id}of d.principals)d.users[id]??={favorites:[]};return recompute(validateLedger(d));
}
export function migrationPreview(input,actorId){const d=input?.version===2?recompute(validateLedger(structuredClone(input))):upgradeLegacy(input,actorId);if(!d.principals.some(p=>p.id===actorId))fail('ローカル利用者が不明です',403);return{taskCount:d.tasks.length,archivedDone:input.version===1?input.tasks.filter(t=>t.state==='done').length:0,actorId,data:d};}
function exact(command,allowed){if(!command||typeof command!=='object'||Array.isArray(command)||Object.keys(command).some(k=>!allowed.includes(k)))fail('コマンドの項目が不正です');}
export function applyCommand(current,command,actorId,at,operationId){
 validateLedger(current);if(!current.principals.some(p=>p.id===actorId))fail('ローカル利用者が不明です',403);
 const d=structuredClone(current),t=d.tasks.find(t=>t.id===command?.taskId),authorize=(id,field)=>{if(!effectivePolicy(current,id)[field].includes(actorId))fail('この操作のPolicyに含まれていません',403);};
 switch(command?.type){
 case 'createTask':{
  exact(command,['type','id','parentId','name','deps','customFields','relationTiers','details','initialPolicy','initialParticipants']);authorize(command.parentId,'childAdders');if(!command.id||d.tasks.some(t=>t.id===command.id))fail('Task IDが不正または重複です');
  d.tasks.push({id:command.id,name:command.name,details:command.details||'',parent:command.parentId,deps:command.deps||[],progressState:'todo',state:'todo',policy:d.independentItems?generatedTaskPolicy(d.tasks.find(t=>t.id===command.parentId)):{mode:'inherit'},...(d.independentItems?{childRules:structuredClone(d.tasks.find(t=>t.id===command.parentId).childRules||[])}:{}),completionMarks:{},customFields:command.customFields||{},...(d.relationItems?{relationTiers:structuredClone(command.relationTiers)}:{}),...(d.tierProtection?{participants:structuredClone(d.tasks.find(t=>t.id===command.parentId).participants)}:{})});if(command.initialPolicy||command.initialParticipants){if(!d.tierProtection||!d.independentItems)fail('初期設定には独立Tier形式が必要です');const made=d.tasks.find(x=>x.id===command.id),baseline=structuredClone(made);if(command.initialPolicy){exact(command.initialPolicy,['mode','values','tiers']);exact(command.initialPolicy.values,fields);made.policy=structuredClone(command.initialPolicy);}if(command.initialParticipants)made.participants=structuredClone(command.initialParticipants);validateTiers(d,fields);guardTierChanges({...d,tasks:d.tasks.map(x=>x.id===made.id?baseline:x)},d,fields,effectivePolicy,actorId);}break;
 }
 case 'patchTask':{
  exact(command,['type','taskId','patch','policy','participants','relationTiers','myState']);if(!t)fail('Taskがありません',404);authorize(t.id,'editors');exact(command.patch,['name','parent','deps','details',...(d.assigneeStates?[]:['progressState']),'customFields']);if(Object.hasOwn(command.patch,'parent')&&command.patch.parent!==t.parent&&command.patch.parent)authorize(command.patch.parent,'childAdders');Object.assign(t,command.patch);if(command.relationTiers)t.relationTiers=structuredClone(command.relationTiers);if(command.policy){exact(command.policy,['mode','values','tiers']);if(command.policy.mode==='custom')exact(command.policy.values,fields);t.policy=structuredClone(command.policy);}if(command.participants){if(!d.tierProtection)fail('Tier移行が必要です');t.participants=structuredClone(command.participants);}if(command.myState!==undefined){if(!d.assigneeStates||!['todo','doing','hold','done'].includes(command.myState))fail('本人状態が不正です');authorize(t.id,'completers');changeWork(t,actorId,command.myState,actorId,at,operationId,d.audit,'self');}break;
 }
 case 'setPolicy':{
  exact(command,['type','taskId','policy']);if(!t)fail('Taskがありません',404);authorize(t.id,'editors');exact(command.policy,['mode','values','tiers']);if(command.policy.mode==='custom')exact(command.policy.values,fields);t.policy=structuredClone(command.policy);break;
 }
 case 'complete':{
  exact(command,['type','taskId']);if(!t)fail('Taskがありません',404);authorize(t.id,'completers');if(d.assigneeStates)changeWork(t,actorId,'done',actorId,at,operationId,d.audit,'self');else t.completionMarks[actorId]={done:true,at};break;
 }
 case 'reopen':{
  exact(command,['type','taskId','userIds']);if(!t)fail('Taskがありません',404);const targets=command.userIds==='all'?Object.keys(d.assigneeStates?t.workStates:t.completionMarks):command.userIds;if(!list(targets)||targets.some(id=>!d.principals.some(p=>p.id===id)))fail('取消対象が不正です');if(!(targets.length===1&&targets[0]===actorId&&effectivePolicy(current,t.id).completers.includes(actorId)))authorize(t.id,'editors');if(d.assigneeStates){for(const id of targets){const self=id===actorId&&effectivePolicy(current,t.id).completers.includes(actorId);if(self||stateOf(t,id)==='done')changeWork(t,id,'todo',actorId,at,operationId,d.audit,self?'self':'editorCancel');}}else for(const id of targets)if(t.completionMarks[id])t.completionMarks[id]={...t.completionMarks[id],done:false,at,cancelledBy:actorId};break;
 }
 case 'assigneeStates':{exact(command,['type']);for(const task of current.tasks)authorize(task.id,'editors');Object.assign(d,migrateWork(current,at));break;}
 case 'setMyState':{exact(command,['type','taskId','state']);if(!t||!d.assigneeStates)fail('担当者状態への移行が必要です');authorize(t.id,'completers');if(!['todo','doing','hold','done'].includes(command.state))fail('本人状態が不正です');changeWork(t,actorId,command.state,actorId,at,operationId,d.audit,'self');break;}
 case 'relationItems':{exact(command,['type','tier']);if(current.relationItems||!current.independentItems)fail('関係Item変換は実行できません',409);for(const task of current.tasks)authorize(task.id,'editors');const tier=canonicalTier(command.tier);for(const task of current.tasks)if(task.parent||task.deps.length)checkItemChange(effectivePolicy(current,task.id).itemTiers.editors[actorId],undefined,tier);d.relationOriginal=structuredClone(current);d.relationItems=1;for(const task of d.tasks)task.relationTiers={parent:task.parent?tier:null,deps:Object.fromEntries(task.deps.map(id=>[id,tier]))};break;}
 case 'independentItems':{exact(command,['type']);for(const task of current.tasks)authorize(task.id,'editors');Object.assign(d,independentCopy(current,effectivePolicy));break;}
 case 'setChildRules':{exact(command,['type','taskId','rules']);if(!t||!d.independentItems)fail('独立Taskが必要です');authorize(t.id,'editors');validateRules(d,command.rules);guardRules(t.childRules||[],command.rules,effectivePolicy(current,t.id).itemTiers.editors[actorId]);t.childRules=structuredClone(command.rules);break;}
 case 'bulkItems':{exact(command,['type','taskId','field','userId','tier','action','includeDone']);const plan=bulkPlan(current,command,actorId,effectivePolicy);Object.assign(d,plan.data);d.audit.push({operationId,actorId,type:'bulkImpact',at,affected:plan.affected,noop:plan.noop,excluded:plan.excluded});break;}
 case 'migrateTiers':{exact(command,['type','actorTier','defaultTier']);const plan=previewTierMigration(current,actorId,command);if(plan.blocked.length)fail(plan.blocked.join(' / '),409);Object.assign(d,plan.data);break;}
 case 'toggleFavorite':{
  exact(command,['type','taskId']);if(!t)fail('Taskがありません',404);d.users[actorId]??={favorites:[]};const refs=d.users[actorId].favorites;d.users[actorId].favorites=refs.some(f=>f.taskId===t.id)?refs.filter(f=>f.taskId!==t.id):[...refs,{taskId:t.id}];break;
 }
 default:fail('不明なコマンドです');
 }
 if(d.assigneeStates&&command.type==='createTask'){const created=d.tasks.find(t=>t.id===command.id);created.workStates={};delete created.progressState;delete created.completionMarks;}if(d.tierProtection){for(const task of d.tasks){if(task.policy.mode==='custom')for(const field of fields)if(task.policy.tiers?.[field])for(const id of Object.keys(task.policy.tiers[field]))task.policy.tiers[field][id]=canonicalTier(task.policy.tiers[field][id]);if(task.participants)task.participants.forEach(p=>p.tier=canonicalTier(p.tier));}}validateLedger(d);guardTierChanges(current,d,fields,effectivePolicy,actorId);guardRelations(current,d,effectivePolicy,actorId);recompute(d);d.audit.push({operationId,actorId,type:command.type,taskId:command.taskId||command.id,at,...(command.type==='reopen'?{userIds:command.userIds}:{})});return d;
}

export function previewTierMigration(current,actorId,options={}){validateLedger(current);if(!current.principals.some(p=>p.id===actorId))fail('ローカル利用者が不明です',403);return buildTierPlan(current,actorId,fields,effectivePolicy,options);}

export function previewBulk(d,command,actorId){validateLedger(d);const {data,...plan}=bulkPlan(d,command,actorId,effectivePolicy);return plan;}
