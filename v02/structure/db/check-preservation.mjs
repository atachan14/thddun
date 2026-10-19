import{createHash}from'node:crypto';
// Pure independent verifier. Input rows stay with caller; reports contain counts only.
const canonical=x=>x&&typeof x==='object'?Array.isArray(x)?x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const fingerprint=rows=>createHash('sha256').update(JSON.stringify(rows.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest('hex');
export function comparePreserved(before,after){const names=Object.keys(before);if(names.length!==Object.keys(after).length||names.some(n=>!Object.hasOwn(after,n)))throw Error('Protected table set changed');return names.map(table=>({table,beforeCount:before[table].length,afterCount:after[table].length,unchanged:fingerprint(before[table])===fingerprint(after[table])}));}
export function assertPreserved(before,after){const report=comparePreserved(before,after);if(report.some(x=>!x.unchanged))throw Error('Legacy preservation check failed: '+report.filter(x=>!x.unchanged).map(x=>x.table).join(', '));return report;}
