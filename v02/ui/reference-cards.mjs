import{visibleAssignedTasks}from'./detail-dates.mjs';
export const assignedEntryId=(accountId,taskId)=>'assigned:'+accountId+':'+taskId;
export const referenceEntry=(entryId,target)=>({entryId,target,isReference:true});
export function assignedReferenceEntries(data,snapshot,accountId){return visibleAssignedTasks(snapshot,accountId).map(t=>data.tasks.find(n=>n.id===t.id)).filter(Boolean).map(target=>referenceEntry(assignedEntryId(accountId,target.id),target));}
// These are layout nodes, never entity copies. Canonical targets and their parents/status/Policy are untouched.
export function referenceLayout(data,entries,container){const byTarget=new Map(entries.map(e=>[e.target.id,e.entryId])),external=new Map(),nodes=entries.map(e=>({id:e.entryId,name:e.target.name,state:e.target.state,parent:container,deps:(e.target.deps||[]).map(id=>{if(byTarget.has(id))return byTarget.get(id);const original=data.tasks.find(t=>t.id===id);if(!original)return null;const key='outside:'+id;external.set(key,{id:key,name:original.name,state:original.state,parent:null,deps:[]});return key;}).filter(Boolean)}));return{...data,tasks:[...nodes,...external.values()]};}
export function selectedReference(entries,targetId){return entries.find(e=>e.target.id===targetId)?.entryId||null;}
