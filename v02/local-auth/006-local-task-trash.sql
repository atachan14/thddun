-- LOCAL ONLY. Recoverable Task subtree tombstones; no Task/account rows are removed.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_task_trash(
 workspace_id text NOT NULL,id text NOT NULL,root_task_id text NOT NULL,
 deleted_by text NOT NULL REFERENCES principals(id),task_ids jsonb NOT NULL CHECK(jsonb_typeof(task_ids)='array'),
 deleted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,restored_at timestamptz,
 PRIMARY KEY(workspace_id,id),FOREIGN KEY(workspace_id,root_task_id) REFERENCES tasks(workspace_id,id));
REVOKE ALL ON local_task_trash FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('006-local-recoverable-task-trash');
COMMIT;
