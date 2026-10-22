// SQL persistence only; the caller owns the transaction and policy validation.
async function loadFields(client, workspace) {
  const present = await client.query(
    "SELECT to_regclass('thdmn_v02_trial.local_field_definitions') AS present");
  if (!present.rows[0].present) return null;

  // One statement gives all four collections from the same transaction snapshot.
  // Original reads have no ORDER BY; do not introduce a new UI sort contract.
  const { rows } = await client.query(
    "SELECT " +
    "(SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM local_field_definitions d WHERE workspace_id=$1) AS definitions," +
    "(SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM local_field_bindings b WHERE workspace_id=$1) AS bindings," +
    "(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM local_field_values v WHERE workspace_id=$1) AS values," +
    "(SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM local_field_rules r WHERE workspace_id=$1) AS rules",
    [workspace]);
  const model = rows[0], page = row => ({ kind: row.page_kind, id: row.page_id });
  return {
    definitions: model.definitions.map(d => ({ id: d.id, name: d.name, type: d.field_type,
      origin: { kind: d.origin_kind, id: d.origin_id }, builtinKey: d.builtin_key })),
    bindings: model.bindings.map(b => ({ page: page(b), definitionId: b.definition_id,
      required: b.required, enabled: b.enabled })),
    values: model.values.map(v => ({ page: page(v), definitionId: v.definition_id, value: v.value_json })),
    rules: model.rules.map(r => ({ page: page(r), definitionId: r.definition_id,
      required: r.required, enabled: r.enabled })),
  };
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
