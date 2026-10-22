import assert from 'node:assert/strict';
import { openTestDatabase } from '../structure/db/test-support.mjs';
import { snapshotContractFixture } from './snapshot-contract-fixture.mjs';
import { loadFields } from './field-store.mjs';

// Independent pre-optimization query strategy is the data-adapter oracle.
async function originalRead(client, workspace) {
  const read = async table => (await client.query('SELECT * FROM ' + table + ' WHERE workspace_id=$1', [workspace])).rows;
  const page = row => ({ kind: row.page_kind, id: row.page_id });
  const definitions = await read('local_field_definitions'), bindings = await read('local_field_bindings');
  const values = await read('local_field_values'), rules = await read('local_field_rules');
  return {
    definitions: definitions.map(d => ({ id:d.id, name:d.name, type:d.field_type, origin:{kind:d.origin_kind,id:d.origin_id}, builtinKey:d.builtin_key })),
    bindings: bindings.map(b => ({page:page(b),definitionId:b.definition_id,required:b.required,enabled:b.enabled})),
    values: values.map(v => ({page:page(v),definitionId:v.definition_id,value:v.value_json})),
    rules: rules.map(r => ({page:page(r),definitionId:r.definition_id,required:r.required,enabled:r.enabled})),
  };
}
const empty = await openTestDatabase();
try { let count=0;assert.equal(await loadFields({query:(...args)=>{count++;return empty.query(...args);}},'fixture'),null);assert.equal(count,1); }
finally { await empty.close(); }
const fixture = await snapshotContractFixture();
try {
  const cases = [['zero','number',0],['false','boolean',false],['null','json',null],['array','json',[0,false,null,'日本語']],['object','json',{deep:{text:'fictional',n:1.25}}],['date','date','2026-10-22'],['empty','text','']];
  for (const [id,type,value] of cases) {
    await fixture.db.query("INSERT INTO local_field_definitions VALUES('fixture',$1,$1,$2,'task','task-0',NULL)",['equivalence-'+id,type]);
    await fixture.db.query("INSERT INTO local_field_bindings VALUES('fixture','task','task-0',$1,false,true)",['equivalence-'+id]);
    await fixture.db.query("INSERT INTO local_field_values VALUES('fixture','task','task-0',$1,$2)",['equivalence-'+id,JSON.stringify(value)]);
  }
  for (const workspace of ['fixture','foreign-workspace','absent']) {
    const expected=await originalRead(fixture.db,workspace);let count=0;
    const actual=await loadFields({query:(...args)=>{count++;return fixture.db.query(...args);}},workspace);
    assert.deepEqual(actual,expected);assert.equal(count,2);
  }
  console.log('PASS field read batching equals original four-query strategy for three workspaces, typed zero/false/null/Unicode/JSON/date values and full model order; 2 queries instead of 5, absent schema still 1 query/null. Isolated SQL only.');
} finally { await fixture.db.close(); }
