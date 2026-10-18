import assert from'node:assert/strict';
import{Repository,seed,validate,ready}from'./model.mjs';
import{comparisonSeed}from'./comparison.mjs';
const d=validate(comparisonSeed()),get=id=>d.tasks.find(t=>t.id===id);
assert.equal(ready(get('calc'),d),true);assert.equal(ready(get('a2'),d),false);
assert.deepEqual(get('b1').deps,['a1']);assert.deepEqual(get('a2').deps,['b2']);
// The visible calc ↔ milestone aggregate is reciprocal; the actual ledger is a DAG.
assert.doesNotThrow(()=>validate(d));
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const original=new Repository(storage),comparison=new Repository(storage,'taskboard.comparison.v1',comparisonSeed);
const edited=seed();edited.tasks[0].name='既存編集';original.save(edited);const snapshot=memory.get('taskboard.v1');
const demo=comparison.load();demo.tasks[0].name='比較編集';comparison.save(demo);
assert.equal(memory.get('taskboard.v1'),snapshot);assert.equal(original.load().tasks[0].name,'既存編集');assert.equal(comparison.load().tasks[0].name,'比較編集');
console.log('PASS comparison actual DAG, independent parent readiness, isolated sample persistence');
