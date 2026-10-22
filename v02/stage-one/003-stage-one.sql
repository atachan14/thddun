-- OFFLINE ONLY. Run after reviewed structure migrations 001/002; no automatic backfill.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
SET LOCAL lock_timeout='3s';
CREATE TABLE account_page_owners(
 workspace_id text NOT NULL, page_kind text NOT NULL DEFAULT 'account' CHECK(page_kind='account'),
 page_id text NOT NULL, principal_id text NOT NULL REFERENCES principals(id),
 PRIMARY KEY(workspace_id,principal_id), UNIQUE(workspace_id,page_id),
 FOREIGN KEY(workspace_id,page_kind,page_id) REFERENCES structure_pages(workspace_id,page_kind,page_id));
CREATE TABLE stage_task_owners(
 workspace_id text NOT NULL,task_id text NOT NULL,principal_id text NOT NULL REFERENCES principals(id),
 PRIMARY KEY(workspace_id,task_id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id));
CREATE TABLE stage_task_members(
 workspace_id text NOT NULL,task_id text NOT NULL,principal_id text NOT NULL REFERENCES principals(id),
 PRIMARY KEY(workspace_id,task_id,principal_id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id));
REVOKE ALL ON account_page_owners,stage_task_owners,stage_task_members FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('003-stage-one');
COMMIT;
