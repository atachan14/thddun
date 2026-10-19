-- OFFLINE REVIEW FILE. Same session must explicitly supply a reviewed JSON array:
-- SELECT set_config('thdmn.structure_root_manifest', $1, false);
-- [{"taskId":"...","pageKind":"account|group","pageId":"..."}]
-- Never infer root placement from owner_space_id. No real manifest is included.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
SET LOCAL lock_timeout='3s';
LOCK TABLE tasks,spaces,task_dependencies,task_references,accounts,principals,service_credentials,credential_workspaces,credential_actions,principal_permissions,memberships,task_read_spaces,task_policy,task_participants,task_child_rules,task_parent_tiers,assignee_states,placements,doc_references,operations,audit,workspace_revisions,workspaces IN SHARE MODE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM structure_migrations WHERE version='001-structure-additive') OR EXISTS(SELECT 1 FROM structure_migrations WHERE version='002-structure-backfill') THEN RAISE EXCEPTION 'Structure migration order mismatch'; END IF;
 IF NULLIF(current_setting('thdmn.structure_root_manifest',true),'') IS NULL THEN RAISE EXCEPTION 'Reviewed root manifest required'; END IF;
 IF jsonb_typeof(current_setting('thdmn.structure_root_manifest')::jsonb)<>'array' THEN RAISE EXCEPTION 'Invalid root manifest'; END IF;
END $$;
-- Freeze and compare an independently captured baseline before backfilling.
DO $$ DECLARE table_name text; expected jsonb; actual_count bigint; actual_hash text;
BEGIN
 IF NULLIF(current_setting('thdmn.structure_baseline',true),'') IS NULL THEN RAISE EXCEPTION 'Reviewed preservation baseline required'; END IF;
 expected=current_setting('thdmn.structure_baseline')::jsonb;
 FOREACH table_name IN ARRAY ARRAY['workspaces','workspace_revisions','accounts','principals','service_credentials','credential_workspaces','credential_actions','principal_permissions','spaces','memberships','tasks','task_read_spaces','task_policy','task_participants','task_child_rules','task_dependencies','task_parent_tiers','assignee_states','task_references','placements','doc_references','operations','audit'] LOOP
  EXECUTE format('SELECT count(*),md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb)::text) FROM %I t',table_name) INTO actual_count,actual_hash;
  IF expected->table_name->>'count' IS DISTINCT FROM actual_count::text OR expected->table_name->>'fingerprint' IS DISTINCT FROM actual_hash THEN RAISE EXCEPTION 'Legacy preservation baseline changed'; END IF;
 END LOOP;
END $$;
CREATE TEMP TABLE structure_root_manifest(task_id text PRIMARY KEY,page_kind text NOT NULL CHECK(page_kind IN('account','group')),page_id text NOT NULL) ON COMMIT DROP;
INSERT INTO structure_root_manifest SELECT x."taskId",x."pageKind",x."pageId" FROM jsonb_to_recordset(current_setting('thdmn.structure_root_manifest')::jsonb) AS x("taskId" text,"pageKind" text,"pageId" text);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM tasks t LEFT JOIN structure_root_manifest m ON m.task_id=t.id WHERE t.parent_id IS NULL AND m.task_id IS NULL)
 OR EXISTS(SELECT 1 FROM structure_root_manifest m LEFT JOIN tasks t ON t.id=m.task_id LEFT JOIN spaces s ON s.id=m.page_id AND s.kind=m.page_kind AND s.workspace_id=t.workspace_id WHERE t.id IS NULL OR t.parent_id IS NOT NULL OR s.id IS NULL)
 OR EXISTS(SELECT 1 FROM tasks t JOIN tasks p ON p.id=t.parent_id WHERE t.workspace_id<>p.workspace_id)
 OR EXISTS(SELECT 1 FROM task_dependencies d JOIN tasks t ON t.id=d.task_id JOIN tasks p ON p.id=d.prerequisite_id WHERE t.workspace_id<>p.workspace_id)
 OR EXISTS(SELECT 1 FROM task_references r JOIN tasks t ON t.id=r.task_id LEFT JOIN spaces s ON s.id=r.container_space_id LEFT JOIN tasks c ON c.id=r.container_task_id WHERE (r.container_space_id IS NOT NULL AND (s.id IS NULL OR s.workspace_id<>t.workspace_id)) OR (r.container_task_id IS NOT NULL AND (c.id IS NULL OR c.workspace_id<>t.workspace_id)))
 THEN RAISE EXCEPTION 'Unresolved structure mappings'; END IF;
 IF EXISTS(WITH RECURSIVE edges AS (SELECT task_id AS a,prerequisite_id AS b FROM task_dependencies UNION SELECT parent_id,id FROM tasks WHERE parent_id IS NOT NULL),walk AS (SELECT a,b,ARRAY[a,b] AS path,a=b AS cycle FROM edges UNION ALL SELECT w.a,e.b,w.path||e.b,e.b=ANY(w.path) FROM walk w JOIN edges e ON e.a=w.b WHERE NOT w.cycle) SELECT 1 FROM walk WHERE cycle)
 THEN RAISE EXCEPTION 'Structure completion cycle'; END IF;
END $$;
INSERT INTO structure_pages SELECT workspace_id,kind,id FROM spaces;
INSERT INTO structure_parents SELECT t.workspace_id,t.id,CASE WHEN t.parent_id IS NOT NULL THEN 'task' ELSE m.page_kind END,CASE WHEN t.parent_id IS NULL THEN m.page_id END,t.parent_id FROM tasks t LEFT JOIN structure_root_manifest m ON m.task_id=t.id;
INSERT INTO structure_references SELECT t.workspace_id,r.id,r.task_id,CASE WHEN r.container_task_id IS NOT NULL THEN 'task' ELSE s.kind END,r.container_space_id,r.container_task_id FROM task_references r JOIN tasks t ON t.id=r.task_id LEFT JOIN spaces s ON s.id=r.container_space_id;
-- Existing entity prerequisites need no synthetic registration origin/backfill.
INSERT INTO structure_migrations(version) VALUES('002-structure-backfill');
COMMIT;
