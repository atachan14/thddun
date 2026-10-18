// Pure projection of the server's visible DTO. Never infer hidden relations/counts.
export function taskView(snapshot,{rootId=null,collapsed=new Set()}={}){
 const tasks=snapshot.data.tasks,byId=new Map(tasks.map(t=>[t.id,t])),children=new Map();
 for(const t of tasks){const parent=byId.has(t.parentId)?t.parentId:null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(t);}
 const rows=[],seen=new Set();function visit(task,depth){if(seen.has(task.id))return;seen.add(task.id);rows.push({...task,depth,childCount:(children.get(task.id)||[]).length,prerequisites:task.prerequisiteIds.filter(id=>byId.has(id)).map(id=>({id,title:byId.get(id).title}))});if(!collapsed.has(task.id))for(const child of children.get(task.id)||[])visit(child,depth+1);}
 if(rootId&&byId.has(rootId))visit(byId.get(rootId),0);else for(const task of children.get(null)||[])visit(task,0);
 const visible=new Set(rows.map(t=>t.id)),relations=[];for(const task of tasks)for(const prerequisiteId of task.prerequisiteIds)if(byId.has(prerequisiteId))relations.push({taskId:task.id,prerequisiteId,folded:!visible.has(task.id)||!visible.has(prerequisiteId)});
 return{rows,relations,names:new Map(snapshot.data.users.map(u=>[u.id,u.name]))};
}
