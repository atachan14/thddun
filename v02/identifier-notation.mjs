// Display notation only. Stored identifiers and relation keys never contain these symbols.
export const referenceKind=value=>typeof value==='string'&&value.trim().startsWith('@')?'account':typeof value==='string'&&value.trim().startsWith('#')?'task':null;
export function parseReference(value,kind){if(typeof value!=='string')return'';let text=value.trim();const prefix=referenceKind(text);if(prefix){if(kind&&prefix!==kind)return'';text=text.slice(1);if(prefix==='account'&&!/^[A-Za-z]/.test(text)||prefix==='task'&&!/^[0-9]/.test(text))return'';}return text.toLowerCase();}
export const formatReference=(kind,id)=>id?(kind==='account'?'@':'#')+id:'';

export const formatPageName=(kind,name)=>(kind==='account'?'@':kind==='task'?'#':'')+name;
export const formatNamedReference=(kind,name,id)=>name+(kind==='account'?'@':'#')+id;
export const formatPerson=p=>p?.nameIsIdentifier?p.name:formatPageName('account',p?.name||'Account');

export const formatAssignedPage=name=>'!担当@'+name;
