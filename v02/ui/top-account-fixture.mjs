// Dedicated fictional, process-local page data. Never imports trial/Auth/DB data.
import{validateStructure,projectPage,roots}from'../structure/contract.mjs';
export function accountFixture(){return validateStructure({
 accounts:[{id:'local-account-a',title:'架空利用者A'},{id:'local-account-b',title:'架空利用者B'},{id:'local-account-empty',title:'架空の空Account'}],
 groups:[{id:'local-group',title:'架空の共同Group'}],
 tasks:[
  {id:'local-a-plan',title:'休日の小さな計画',parent:{kind:'account',id:'local-account-a'},assignees:['local-person-b'],workStates:{'local-person-b':'todo'}},
  {id:'local-a-book',title:'読みたい本を選ぶ',parent:{kind:'account',id:'local-account-a'},assignees:['local-person-a'],workStates:{'local-person-a':'done'}},
  {id:'local-a-child',title:'行きたい場所をメモする',parent:{kind:'task',id:'local-a-plan'},assignees:['local-person-a'],workStates:{'local-person-a':'todo'}},
  {id:'local-b-own',title:'Bだけの架空の準備',parent:{kind:'account',id:'local-account-b'},assignees:['local-person-b'],workStates:{'local-person-b':'todo'}},
  {id:'local-group-assigned-a',title:'共同Groupの架空作業',parent:{kind:'group',id:'local-group'},assignees:['local-person-a'],workStates:{'local-person-a':'todo'}}
 ],references:[{id:'local-book-reference',taskId:'local-a-book',container:{kind:'task',id:'local-a-plan'}}],dependencyEdges:[{id:'local-book-before-plan',prerequisiteTaskId:'local-a-book',taskId:'local-a-plan'}]
 });}
export function fixtureAccess(model,accountId){
 const container=id=>{let p=model.tasks.find(t=>t.id===id)?.parent;while(p?.kind==='task')p=model.tasks.find(t=>t.id===p.id)?.parent;return p;};
 const readableTask=id=>{const p=container(id);return p?.kind==='account'?p.id===accountId:p?.kind==='group'&&accountId==='local-account-a';};
 return{canReadTask:(_,id)=>readableTask(id),canReadPage:(_,p)=>p.kind==='task'?readableTask(p.id):p.kind==='account'?p.id===accountId:accountId==='local-account-a',canEditTask:()=>false};
}
export function readFixturePage(accountId,path){const model=accountFixture(),access=fixtureAccess(model,accountId),context={subjectId:accountId};if(!model.accounts.some(a=>a.id===accountId))return Response.json({error:'Authentication required'},{status:401});
 if(path==='/api/v02/structure/roots')return Response.json({revision:0,pages:roots(model,context,access)});
 const match=/^\/api\/v02\/structure\/pages\/(account|group|task)\/([^/]+)$/.exec(path);if(!match)return Response.json({error:'Not found'},{status:404});
 try{return Response.json(projectPage(model,context,{kind:match[1],id:decodeURIComponent(match[2])},access));}catch{return Response.json({error:'Not found'},{status:404});}
}

export function fixtureSnapshot(accountId){const model=accountFixture(),access=fixtureAccess(model,accountId),ctx={subjectId:accountId},visible=model.tasks.filter(t=>access.canReadTask(ctx,t.id));return{revision:0,actorPrincipalId:accountId==='local-account-b'?'local-person-b':'local-person-a',data:{users:[{id:'local-person-a',name:'架空利用者A'},{id:'local-person-b',name:'架空利用者B'}],tasks:visible.map(t=>({id:t.id,title:t.title,details:'ローカル専用の架空Taskです。',parentId:t.parent.kind==='task'?t.parent.id:null,parentPage:{...t.parent},prerequisiteIds:model.dependencyEdges.filter(e=>e.taskId===t.id).map(e=>e.prerequisiteTaskId),assignees:t.assignees,workStates:t.workStates,capabilities:{},completion:projectPage(model,ctx,{kind:'task',id:t.id},access).pageTask.completion})),references:model.references.filter(r=>visible.some(t=>t.id===r.taskId)&&r.container.kind==='task'&&visible.some(t=>t.id===r.container.id))}};}
