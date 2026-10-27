export const DEMO_MARKER='local-public-demo-v1:complete';
export async function loadDemoRegistry(pool,workspace){
 const client=await pool.connect();try{
  // Normal commands choose operation IDs, but their server-generated fingerprints
  // cannot equal this operator-only seed marker. An ID collision must not disable entry.
  const rows=(await client.query("SELECT response FROM thdmn_v02_trial.operations WHERE workspace_id=$1 AND operation_id=$2 AND fingerprint='local-public-demo-v1'",[workspace,DEMO_MARKER])).rows;
  if(!rows.length)return [];
  const registry=rows[0].response?.registry;
  if(rows.length!==1||!Array.isArray(registry)||registry.length!==3||new Set(registry.map(r=>r.role)).size!==3||registry.some(r=>!['manager','staff','guest'].includes(r.role)||![r.principalId,r.pageId,r.loginId].every(v=>typeof v==='string'&&v.length>0))||new Set(registry.map(r=>r.principalId)).size!==3)throw Error('Invalid shared demo registry');
  return registry;
 }finally{client.release();}
}
