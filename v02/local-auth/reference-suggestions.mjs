import{parseReference,referenceKind}from'../identifier-notation.mjs';
export const normalizeReference=value=>parseReference(value);
// Input consists only of the server-authorized snapshot. Hidden ancestors never enter it.
export function visibleLocation(snapshot,page){const all=[...snapshot.accountPages.map(a=>({...a,kind:'account',parent:a.parent})),...snapshot.data.tasks.map(t=>({...t,kind:'task',parent:t.parentPage}))],seen=new Set(),parts=[];let p=all.find(x=>x.kind===page.kind&&x.id===page.id)?.parent;
 while(p){const k=p.kind+':'+p.id;if(seen.has(k))break;seen.add(k);const n=all.find(x=>x.kind===p.kind&&x.id===p.id);if(!n)break;parts.unshift(n.title);p=n.parent;}return parts.join(' ＞ ');}
export function referenceSuggestions(snapshot,query='',{kind,purpose}={}){if(purpose&&!['move','grant','view'].includes(purpose))return[];const q=normalizeReference(query);if(referenceKind(query)&&query.trim().length>1&&!q)return[];return[...snapshot.accountPages.map(a=>({...a,kind:'account'})),...snapshot.data.tasks.map(t=>({...t,kind:'task'}))].filter(p=>p.publicId&&(!kind||p.kind===kind)&&(!referenceKind(query)||p.kind===referenceKind(query))&&(purpose!=='grant'||p.kind==='account')&&(!purpose||purpose!=='move'||p.capabilities?.createChild)&&(p.publicId.startsWith(q)||p.title.toLowerCase().includes(q))).slice(0,30).map(p=>({...p,location:visibleLocation(snapshot,p)}));}

export function moveCandidates(snapshot,exclude){return [...snapshot.accountPages.map(a=>({...a,kind:'account'})),...snapshot.data.tasks.map(t=>({...t,kind:'task'}))].filter(p=>p.publicId&&p.capabilities?.createChild&&(!exclude||p.kind!==exclude.kind||p.id!==exclude.id));}

export function resolveVisiblePage(snapshot,kind,value){const q=parseReference(value,kind),rows=kind==='account'?snapshot.accountPages:snapshot.data.tasks;return rows.find(p=>p.publicId===q)||null;}
