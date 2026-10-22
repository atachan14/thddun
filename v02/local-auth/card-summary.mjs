import{isTaskComplete}from'../task-completion.mjs';
const key=p=>p.kind+':'+p.id;
export const taskCardDone=isTaskComplete;
// Aggregate evaluation stays server-side even for private assigned Tasks; only overall Account completion is disclosed.
export function cardSummaries(model,owners,readable){const nodes=[...model.tasks.map(t=>({...t,kind:'task'})),...model.accounts.map(a=>({...a,kind:'account'}))],memo=new Map(),visiting=new Set();
 function completion(p){const k=key(p);if(memo.has(k))return memo.get(k);if(visiting.has(k))throw Error('Account completion cycle');visiting.add(k);const n=nodes.find(n=>key(n)===k);let result;
 if(!n)throw Error('Account completion target missing');if(p.kind==='task')result={completed:taskCardDone(n),disclosed:true};else{const ids=new Set(owners.filter(o=>o.page_id===p.id).map(o=>o.principal_id)),requiredTasks=new Map(model.tasks.filter(t=>t.assignees.some(id=>ids.has(id))||t.parent.kind==='account'&&t.parent.id===p.id).map(t=>[t.id,t])),children=model.accounts.filter(a=>a.parent?.kind==='account'&&a.parent.id===p.id),requirements=[...requiredTasks.values()].map(t=>completion({kind:'task',id:t.id})).concat(children.map(a=>completion({kind:'account',id:a.id})));
 // User-confirmed: zero assigned Tasks, direct Tasks and direct Accounts is complete.
 result=!requirements.length?{completed:true,disclosed:true}:requirements.some(c=>c.completed===false)?{completed:false,disclosed:true}:{completed:true,disclosed:true};}
 visiting.delete(k);memo.set(k,result);return result;}
 return p=>{const children=nodes.filter(n=>n.parent&&key(n.parent)===key(p)&&readable(n)),counts=kind=>{const set=children.filter(n=>n.kind===kind);return{done:set.filter(n=>completion(n).completed===true).length,total:set.length};};return{cardCompletion:completion(p),cardCounts:{tasks:counts('task'),accounts:counts('account')}};};
}
