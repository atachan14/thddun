// Isolated structural contract. No ownership, permission inheritance or deletion rules.
export class StructureError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=()=>{throw new StructureError(400,'Invalid structure');};
const kinds=['account','group','task'];
const key=p=>p.kind+':'+p.id;
export const samePage=(a,b)=>!!a&&!!b&&a.kind===b.kind&&a.id===b.id;
const text=v=>typeof v==='string'&&v.length>0&&v.length<=160;
const page=p=>p&&kinds.includes(p.kind)&&text(p.id)&&Object.keys(p).every(k=>['kind','id'].includes(k));
export function validateStructure(model){
 if(!model||!['accounts','groups','tasks','references'].every(k=>Array.isArray(model[k])))fail();
 const all=new Map(),tasks=new Map();
 for(const [collection,kind]of[['accounts','account'],['groups','group'],['tasks','task']])for(const item of model[collection]){
  if(!item||!text(item.id)||!text(item.title)||all.has(key({kind,id:item.id})))fail();
  if(kind!=='task'&&Object.hasOwn(item,'parent'))fail();
  all.set(key({kind,id:item.id}),item);if(kind==='task')tasks.set(item.id,item);
 }
 for(const t of model.tasks){
  if(!page(t.parent)||!all.has(key(t.parent))||!Array.isArray(t.prerequisiteIds)||new Set(t.prerequisiteIds).size!==t.prerequisiteIds.length)fail();
  for(const id of t.prerequisiteIds){const target=tasks.get(id);if(id===t.id||!target||!samePage(t.parent,target.parent))fail();}
 }
 // Actual Task parents must end at Account or Group. References never participate.
 for(const t of model.tasks){const seen=new Set([t.id]);for(let p=t.parent;p.kind==='task';p=tasks.get(p.id).parent){if(seen.has(p.id))fail();seen.add(p.id);}}
 const visiting=new Set(),done=new Set();
 function dependency(id){if(visiting.has(id))fail();if(done.has(id))return;visiting.add(id);for(const dep of tasks.get(id).prerequisiteIds)dependency(dep);visiting.delete(id);done.add(id);}
 for(const t of model.tasks)dependency(t.id);
 const refs=new Set();for(const r of model.references){if(!r||!text(r.id)||refs.has(r.id)||!tasks.has(r.taskId)||!page(r.container)||!all.has(key(r.container)))fail();refs.add(r.id);}
 return model;
}
export function roots(model,context,access){
 return [['accounts','account'],['groups','group']].flatMap(([collection,kind])=>model[collection].filter(x=>access.canReadPage(context,{kind,id:x.id})).map(x=>({kind,id:x.id,title:x.title})));
}
export function projectPage(model,context,target,access){
 if(!page(target))throw new StructureError(404,'Not found');
 const find=p=>model[p.kind==='task'?'tasks':p.kind==='account'?'accounts':'groups'].find(x=>x.id===p.id);
 const readable=p=>access.canReadPage(context,p)&&(p.kind!=='task'||access.canReadTask(context,p.id));
 const item=find(target);if(!item||!readable(target))throw new StructureError(404,'Not found');
 const breadcrumb=[];let boundary=false;
 for(let p=target;p;){if(!readable(p)){boundary=true;break;}const x=find(p);breadcrumb.unshift({...p,title:x.title});p=p.kind==='task'?x.parent:null;}
 const visible=model.tasks.filter(t=>readable({kind:'task',id:t.id})),visibleIds=new Set(visible.map(t=>t.id));
 const children=visible.filter(t=>samePage(t.parent,target)),ids=new Set(children.map(t=>t.id));
 const actual=children.map(t=>({entryId:'task:'+t.id,kind:'task',taskId:t.id,title:t.title,target:{kind:'task',id:t.id}}));
 const references=model.references.filter(r=>samePage(r.container,target)&&visibleIds.has(r.taskId)).map(r=>({entryId:'reference:'+r.id,kind:'reference',referenceId:r.id,taskId:r.taskId,title:visible.find(t=>t.id===r.taskId).title,target:{kind:'task',id:r.taskId}}));
 return{page:{...target,title:item.title},breadcrumbs:breadcrumb,breadcrumbBoundary:boundary,entries:[...actual,...references],prerequisites:children.flatMap(t=>t.prerequisiteIds.filter(id=>ids.has(id)).map(id=>({taskId:t.id,prerequisiteId:id})))};
}
