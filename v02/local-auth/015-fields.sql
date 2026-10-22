-- Prepared local migration. Additive: original custom_fields and audit metadata remain untouched.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_field_definitions(workspace_id text NOT NULL REFERENCES workspaces(id),id text NOT NULL,name text NOT NULL,field_type text NOT NULL CHECK(field_type IN('text','number','boolean','date','json','datetime')),origin_kind text NOT NULL CHECK(origin_kind IN('task','account','thdmn')),origin_id text,builtin_key text CHECK(builtin_key IN('created_at','last_completed_at')),PRIMARY KEY(workspace_id,id));
CREATE TABLE local_field_bindings(workspace_id text NOT NULL,page_kind text NOT NULL CHECK(page_kind IN('task','account')),page_id text NOT NULL,definition_id text NOT NULL,required boolean NOT NULL DEFAULT false,enabled boolean NOT NULL DEFAULT true,PRIMARY KEY(workspace_id,page_kind,page_id,definition_id),FOREIGN KEY(workspace_id,definition_id) REFERENCES local_field_definitions(workspace_id,id));
CREATE TABLE local_field_values(workspace_id text NOT NULL,page_kind text NOT NULL,page_id text NOT NULL,definition_id text NOT NULL,value_json jsonb,PRIMARY KEY(workspace_id,page_kind,page_id,definition_id),FOREIGN KEY(workspace_id,page_kind,page_id,definition_id) REFERENCES local_field_bindings(workspace_id,page_kind,page_id,definition_id));
CREATE TABLE local_field_rules(workspace_id text NOT NULL,page_kind text NOT NULL,page_id text NOT NULL,definition_id text NOT NULL,required boolean NOT NULL DEFAULT false,enabled boolean NOT NULL DEFAULT true,PRIMARY KEY(workspace_id,page_kind,page_id,definition_id),FOREIGN KEY(workspace_id,page_kind,page_id,definition_id) REFERENCES local_field_bindings(workspace_id,page_kind,page_id,definition_id));
CREATE FUNCTION protect_field_definition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Field definitions are stable; editing/retirement requires a separate operation';END $$;
CREATE TRIGGER protect_field_definition BEFORE UPDATE OR DELETE ON local_field_definitions FOR EACH ROW EXECUTE FUNCTION protect_field_definition();
INSERT INTO local_field_definitions SELECT id,'thdmn.created_at','作成日','datetime','thdmn',NULL,'created_at' FROM workspaces;
INSERT INTO local_field_definitions SELECT id,'thdmn.last_completed_at','最終完了','datetime','thdmn',NULL,'last_completed_at' FROM workspaces;
INSERT INTO local_field_definitions SELECT t.workspace_id,'legacy:'||md5(jsonb_build_array(t.workspace_id,t.id,e.key)::text),e.key,CASE jsonb_typeof(e.value) WHEN 'string' THEN 'text' WHEN 'number' THEN 'number' WHEN 'boolean' THEN 'boolean' ELSE 'json' END,'task',t.id,NULL FROM tasks t CROSS JOIN LATERAL jsonb_each(t.custom_fields) e;
INSERT INTO local_field_bindings SELECT workspace_id,'task',origin_id,id,false,true FROM local_field_definitions WHERE origin_kind='task';
INSERT INTO local_field_values SELECT t.workspace_id,'task',t.id,'legacy:'||md5(jsonb_build_array(t.workspace_id,t.id,e.key)::text),e.value FROM tasks t CROSS JOIN LATERAL jsonb_each(t.custom_fields) e;
-- Preserve existing visible dates as optional selections. Future pages can select official fields freely.
INSERT INTO local_field_bindings SELECT workspace_id,page_kind,page_id,'thdmn.created_at',false,true FROM structure_pages WHERE page_kind IN('task','account');
INSERT INTO local_field_bindings SELECT workspace_id,page_kind,page_id,'thdmn.last_completed_at',false,true FROM structure_pages WHERE page_kind='task';
REVOKE ALL ON local_field_definitions,local_field_bindings,local_field_values,local_field_rules FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('015-fields');
COMMIT;
