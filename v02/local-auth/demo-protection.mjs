import {ApiError} from '../domain-draft.mjs';
const key=p=>p?.kind+':'+p?.id;
export function protectedSubtree(s,page,registry=[]){const nodes=[...s.model.accounts.map(a=>({...a,kind:'account'})),...s.model.tasks.map(t=>({...t,kind:'task'}))];return registry.some(r=>{let n=nodes.find(n=>n.kind==='account'&&n.id===r.pageId);const seen=new Set();while(n){if(key(n)===key(page))return true;if(seen.has(key(n)))return true;seen.add(key(n));n=nodes.find(x=>key(x)===key(n.parent));}return false;});}
export function assertDemoCommand(s,c,context,registry=[]){
 const fixed=page=>page?.kind==='account'&&registry.some(r=>r.pageId===page.id);
 const page=c.page||(c.type==='editAccount'?{kind:'account',id:c.accountId}:null);
 if((c.type==='editAccount'||c.type==='setPagePolicy')&&fixed(page))throw new ApiError(403,'Shared demo Account is protected');
 if(['movePage','deletePage','deleteTask'].includes(c.type)&&protectedSubtree(s,page,registry))throw new ApiError(403,'Subtree contains a protected shared demo Account');
 if(['restorePage','restoreTask'].includes(c.type)&&s.trash.some(t=>t.root_kind===page.kind&&t.root_page_id===page.id&&registry.some(r=>t.account_ids.includes(r.pageId))))throw new ApiError(403,'Protected demo restore requires local operator review');
 const recipients=[...(c.policyChanges||[]).filter(g=>g.permission!==null).map(g=>g.publicId),...(c.assigneeAdds||[]),...(c.type==='setPagePolicy'&&c.permission!==null?[c.publicId||c.username||c.principalId]:[])];
 if(recipients.some(id=>registry.some(r=>r.loginId===String(id).replace(/^@/,'').toLowerCase()||r.principalId===id))&&!context.publicDemoAccessConfirmed)throw new ApiError(409,'Confirm access for a public shared demo Account');
}
export function projectDemoSnapshot(result,s,registry=[]){if(!registry.length)return result;const fixed=id=>registry.some(r=>r.pageId===id);for(const a of result.accountPages){a.publicSharedDemo=fixed(a.id);if(a.publicSharedDemo){a.capabilities.editContent=false;a.capabilities.managePolicy=false;}if(protectedSubtree(s,{kind:'account',id:a.id},registry)){a.capabilities.move=false;a.capabilities.delete=false;if(a.deletionPlan)a.deletionPlan.canDelete=false;}}for(const t of result.data.tasks)if(protectedSubtree(s,{kind:'task',id:t.id},registry)){t.capabilities.move=false;t.capabilities.delete=false;if(t.deletionPlan)t.deletionPlan.canDelete=false;}result.trash=result.trash.filter(t=>!s.trash.some(raw=>raw.id===t.id&&registry.some(r=>raw.account_ids.includes(r.pageId))));return result;}
