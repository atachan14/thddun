import assert from'node:assert/strict';import{loadDemoRegistry}from'./demo-registry.mjs';
const pool=rows=>({async connect(){return{async query(sql,args){assert(sql.includes('thdmn_v02_trial.operations'));assert.equal(args[0],'demo');return{rows};},release(){}};}});
assert.deepEqual(await loadDemoRegistry(pool([]),'demo'),[]);
const registry=['manager','staff','guest'].map(role=>({role,principalId:'principal-'+role,pageId:'page-'+role,loginId:'local_demo_'+role}));
assert.deepEqual(await loadDemoRegistry(pool([{response:{registry}}]),'demo'),registry);
for(const value of [[],registry.slice(0,2),[...registry.slice(0,2),registry[0]],registry.map((r,i)=>i===2?{...r,principalId:registry[0].principalId}:r)])await assert.rejects(loadDemoRegistry(pool([{response:{registry:value}}]),'demo'));
console.log('PASS server-owned qualified demo registry: absent disabled, exact three roles, duplicate/malformed registry fails closed.');
