// SQL persistence only; the caller owns the transaction and policy validation.
async function loadFields(client, w) {
  if (!(await client.query("SELECT to_regclass('thdmn_v02_trial.local_field_definitions') AS present")).rows[0].present) return null;
  const rows = async (table) => (await client.query("SELECT * FROM " + table + " WHERE workspace_id=$1", [w])).rows, page = (r) => ({ kind: r.page_kind, id: r.page_id });
  return { definitions: (await rows("local_field_definitions")).map((d) => ({ id: d.id, name: d.name, type: d.field_type, origin: { kind: d.origin_kind, id: d.origin_id }, builtinKey: d.builtin_key })), bindings: (await rows("local_field_bindings")).map((b) => ({ page: page(b), definitionId: b.definition_id, required: b.required, enabled: b.enabled })), values: (await rows("local_field_values")).map((v) => ({ page: page(v), definitionId: v.definition_id, value: v.value_json })), rules: (await rows("local_field_rules")).map((r) => ({ page: page(r), definitionId: r.definition_id, required: r.required, enabled: r.enabled })) };
}
async function writeFields(client, w, prepared) {
  if (!prepared) return;
  const { page, input } = prepared;
  for (const d of input.definitions) await client.query("INSERT INTO local_field_definitions(workspace_id,id,name,field_type,origin_kind,origin_id) VALUES($1,$2,$3,$4,$5,$6)", [w, d.id, d.name, d.type, page.kind, page.id]);
  await client.query("UPDATE local_field_bindings SET enabled=false WHERE workspace_id=$1 AND page_kind=$2 AND page_id=$3", [w, page.kind, page.id]);
  await client.query("UPDATE local_field_rules SET enabled=false WHERE workspace_id=$1 AND page_kind=$2 AND page_id=$3", [w, page.kind, page.id]);
  for (const e of input.entries) {
    await client.query("INSERT INTO local_field_bindings VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(workspace_id,page_kind,page_id,definition_id) DO UPDATE SET required=EXCLUDED.required,enabled=true", [w, page.kind, page.id, e.definitionId, e.required]);
    if (Object.hasOwn(e, "value")) await client.query("INSERT INTO local_field_values VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,page_kind,page_id,definition_id) DO UPDATE SET value_json=EXCLUDED.value_json", [w, page.kind, page.id, e.definitionId, JSON.stringify(e.value)]);
    if (e.forceDescendants) await client.query("INSERT INTO local_field_rules VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(workspace_id,page_kind,page_id,definition_id) DO UPDATE SET required=EXCLUDED.required,enabled=true", [w, page.kind, page.id, e.definitionId, e.required]);
  }
}
export {
  loadFields,
  writeFields
};
