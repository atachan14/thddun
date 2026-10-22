export const permissionRank={none:0,view:1,add:2,manage:3};
export const policyPageKey=p=>p.kind+':'+p.id;
// Only actual parent links propagate permissions. A child Account's external grants are never traversed.
export function downwardPermission(nodes,grants,principalId,target){
 const byKey=new Map();for(const n of nodes){const k=policyPageKey(n);if(byKey.has(k))throw Error('Duplicate policy page');byKey.set(k,n);}
 let rank=0;const seen=new Set();for(let p=target;p;){const k=policyPageKey(p);if(seen.has(k))throw Error('Containment cycle');seen.add(k);const n=byKey.get(k);if(!n)return 0;
 if(n.kind==='task'&&n.assignees?.includes(principalId))rank=Math.max(rank,2);
 for(const g of grants)if(g.principalId===principalId&&policyPageKey(g.page)===k){if(!Object.hasOwn(permissionRank,g.permission))throw Error('Invalid permission');rank=Math.max(rank,permissionRank[g.permission]);}p=n.parent||null;
 }return rank;
}
export function validatePolicyGraph(nodes,dependencies=[]){
 const all=new Map(nodes.map(n=>[policyPageKey(n),n])),edges=new Map(nodes.map(n=>[policyPageKey(n),[]]));if(all.size!==nodes.length)throw Error('Duplicate policy page');
 for(const n of nodes)if(n.parent){const parent=policyPageKey(n.parent);if(!all.has(parent))throw Error('Missing parent');edges.get(parent).push(policyPageKey(n));}
 for(const d of dependencies){const target='task:'+d.taskId,source='task:'+d.prerequisiteTaskId;if(!all.has(target)||!all.has(source))throw Error('Missing dependency');edges.get(target).push(source);}
 const active=new Set(),done=new Set();function visit(k){if(active.has(k))throw Error('Containment or completion cycle');if(done.has(k))return;active.add(k);for(const child of edges.get(k))visit(child);active.delete(k);done.add(k);}for(const k of all.keys())visit(k);return nodes;
}
