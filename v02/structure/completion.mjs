import{taskAppearance}from'../../task-appearance.mjs';
// Pure derived result. Never changes assignee work states or creates reference-local states.
export function deriveCompletion(model,dependencies){
 const byId=new Map(model.tasks.map(t=>[t.id,t])),memo=new Map();
 function visit(id){if(memo.has(id))return memo.get(id);const t=byId.get(id),kids=model.tasks.filter(x=>x.parent.kind==='task'&&x.parent.id===id).map(x=>visit(x.id)),prerequisiteIds=dependencies.filter(x=>x.taskId===id).map(x=>x.prerequisiteTaskId),prerequisites=prerequisiteIds.map(visit),assignees=t.assignees||[],states=t.workStates||{};
  const ownDone=assignees.length>0&&assignees.every(u=>states[u]==='done'),childrenDone=kids.every(x=>x.completed),prerequisitesSatisfied=prerequisites.every(x=>x.completed);
  const intrinsic=taskAppearance({workStates:Object.fromEntries(assignees.map(u=>[u,{state:states[u]||'todo'}]))},assignees,kids.map(x=>({state:x.completed?'done':x.appearance.key})));
  // Preserve child-pending hold color. Do not silently assign a hold/doing state for prerequisites.
  const appearance=intrinsic.key==='done'&&!prerequisitesSatisfied?{...intrinsic,key:'prerequisite-pending',label:'担当者・子は完了／前提待ち（色未決定）'}:intrinsic;
  const value={disclosed:true,ownDone,childrenDone,prerequisitesSatisfied,completed:ownDone&&childrenDone&&prerequisitesSatisfied,appearance};memo.set(id,value);return value;
 }
 for(const t of model.tasks)visit(t.id);return memo;
}
