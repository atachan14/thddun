// Isolated structural contract. No ownership, permission inheritance or deletion rules.
export class StructureError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=()=>{throw new StructureError(400,'Invalid structure');};
const kinds=['account','group','task'];
const key=p=>p.kind+':'+p.id;
export const samePage=(a,b)=>!!a&&!!b&&a.kind===b.kind&&a.id===b.id;
const text=v=>typeof v==='string'&&v.length>0&&v.length<=160;
const page=p=>p&&kinds.includes(p.kind)&&text(p.id)&&Object.keys(p).every(k=>['kind','id'].includes(k));
export function validateStructure(model){
 if(!model||!['accounts','groups','tasks','references','dependencyEdges'].every(k=>Array.isArray(model[k])))fail();
 const all=new Map(),tasks=new Map();
 for(const [collection,kind]of[['accounts','account'],['groups','group'],['tasks','task']])for(const item of model[collection]){
  if(!item||!text(item.id)||!text(item.title)||all.has(key({kind,id:item.id})))fail();
  if(kind!=='task'&&Object.hasOwn(item,'parent'))fail();
  all.set(key({kind,id:item.id}),item);if(kind==='task')tasks.set(item.id,item);
 }
 for(const t of model.tasks){
  if(!page(t.parent)||!all.has(key(t.parent))||Object.hasOwn(t,'prerequisiteIds'))fail();
 }
 // Actual Task parents must end at Account or Group. References never participate.
 for(const t of model.tasks){const seen=new Set([t.id]);for(let p=t.parent;p.kind==='task';p=tasks.get(p.id).parent){if(seen.has(p.id))fail();seen.add(p.id);}}
 const refs=new Set();for(const r of model.references){if(!r||!text(r.id)||refs.has(r.id)||!tasks.has(r.taskId)||!page(r.container)||!all.has(key(r.container)))fail();refs.add(r.id);}
 const edgeIds=new Set(),pairs=new Set(),consumes=new Map(model.tasks.map(t=>[t.id,new Set()]));
 // Preserve the existing child-completion cycle safeguard; no completion result is computed here.
 for(const t of model.tasks)if(t.parent.kind==='task')consumes.get(t.parent.id).add(t.id);
 for(const edge of model.dependencyEdges){
  if(!edge||Object.keys(edge).some(k=>!['id','container','fromEntryId','toEntryId'].includes(k))||!text(edge.id)||edgeIds.has(edge.id)||!page(edge.container)||!all.has(key(edge.container)))fail();edgeIds.add(edge.id);
  const entries=entriesForPage(model,edge.container),from=entries.find(x=>x.entryId===edge.fromEntryId),to=entries.find(x=>x.entryId===edge.toEntryId);
  if(!from||!to||from.taskId===to.taskId)fail();
  const pair=JSON.stringify([key(edge.container),edge.fromEntryId,edge.toEntryId]);if(pairs.has(pair))fail();pairs.add(pair);
  consumes.get(to.taskId).add(from.taskId);
 }
 const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))fail();if(done.has(id))return;visiting.add(id);for(const dep of consumes.get(id))visit(dep);visiting.delete(id);done.add(id);}for(const t of model.tasks)visit(t.id);
 return model;
}
export function roots(model,context,access){
 return [['accounts','account'],['groups','group']].flatMap(([collection,kind])=>model[collection].filter(x=>access.canReadPage(context,{kind,id:x.id})===true).map(x=>({kind,id:x.id,title:x.title})));
}
export function projectPage(model,context,target,access){
 if(!page(target))throw new StructureError(404,'Not found');
 const find=p=>model[p.kind==='task'?'tasks':p.kind==='account'?'accounts':'groups'].find(x=>x.id===p.id);
 const readable=p=>access.canReadPage(context,p)===true&&(p.kind!=='task'||access.canReadTask(context,p.id)===true);
 const item=find(target);if(!item||!readable(target))throw new StructureError(404,'Not found');
 const breadcrumb=[];let boundary=false;
 for(let p=target;p;){if(!readable(p)){boundary=true;break;}const x=find(p);breadcrumb.unshift({...p,title:x.title});p=p.kind==='task'?x.parent:null;}
 const visible=model.tasks.filter(t=>readable({kind:'task',id:t.id})),visibleIds=new Set(visible.map(t=>t.id));
 const entries=entriesForPage(model,target).filter(x=>visibleIds.has(x.taskId)),entryIds=new Set(entries.map(x=>x.entryId));
 return{page:{...target,title:item.title},breadcrumbs:breadcrumb,breadcrumbBoundary:boundary,entries,prerequisites:model.dependencyEdges.filter(e=>samePage(e.container,target)&&entryIds.has(e.fromEntryId)&&entryIds.has(e.toEntryId)).map(e=>({id:e.id,fromEntryId:e.fromEntryId,toEntryId:e.toEntryId})),completionSemantics:'undecided'};
}
// Placement endpoints resolve to real Task IDs only for safety checks; references do not reparent.
export function entriesForPage(model,target){return[
 ...model.tasks.filter(t=>samePage(t.parent,target)).map(t=>({entryId:'task:'+t.id,kind:'task',taskId:t.id,title:t.title,target:{kind:'task',id:t.id}})),
 ...model.references.filter(r=>samePage(r.container,target)).map(r=>({entryId:'reference:'+r.id,kind:'reference',referenceId:r.id,taskId:r.taskId,title:model.tasks.find(t=>t.id===r.taskId).title,target:{kind:'task',id:r.taskId}}))
];}
export function inspectDependencyProposal(model,context,edge,access){
 // Resolve only authorized page entries, so hidden and nonexistent endpoints give the same404.
 if(!edge||!page(edge.container))throw new StructureError(404,'Not found');
 const projected=projectPage(model,context,edge.container,access),ids=new Set(projected.entries.map(x=>x.entryId));
 if(!ids.has(edge.fromEntryId)||!ids.has(edge.toEntryId))throw new StructureError(404,'Not found');
 validateStructure({...model,dependencyEdges:[...model.dependencyEdges,edge]});return{structurallyValid:true,writeReady:false,edge:structuredClone(edge),requiredChecks:['authority','audience','completion-scope']};
}
