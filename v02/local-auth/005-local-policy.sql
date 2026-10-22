-- LOCAL DEVELOPMENT ONLY. Retain legacy Tier/Policy and previous local vocabulary for review.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_policy_vocabulary_backup AS SELECT * FROM local_page_grants;
ALTER TABLE local_page_grants DROP CONSTRAINT local_page_grants_permission_check;
UPDATE local_page_grants SET permission=CASE permission WHEN 'edit' THEN 'manage' WHEN 'create' THEN 'add' ELSE permission END;
ALTER TABLE local_page_grants ADD CONSTRAINT local_page_grants_permission_check CHECK(permission IN('view','add','manage'));
CREATE TABLE local_account_parents(
 workspace_id text NOT NULL,account_kind text NOT NULL DEFAULT 'account' CHECK(account_kind='account'),account_id text NOT NULL,
 parent_kind text NOT NULL CHECK(parent_kind IN('account','task')),parent_page_id text,parent_task_id text,
 PRIMARY KEY(workspace_id,account_id),
 CHECK((parent_kind='account' AND parent_page_id IS NOT NULL AND parent_task_id IS NULL) OR (parent_kind='task' AND parent_task_id IS NOT NULL AND parent_page_id IS NULL)),
 FOREIGN KEY(workspace_id,account_kind,account_id) REFERENCES structure_pages(workspace_id,page_kind,page_id),
 FOREIGN KEY(workspace_id,parent_kind,parent_page_id) REFERENCES structure_pages(workspace_id,page_kind,page_id),
 FOREIGN KEY(workspace_id,parent_task_id) REFERENCES tasks(workspace_id,id));
REVOKE ALL ON local_policy_vocabulary_backup,local_account_parents FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('005-local-policy-manage-add-moves');
COMMIT;
