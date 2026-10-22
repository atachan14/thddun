BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
ALTER TABLE local_field_definitions DROP CONSTRAINT local_field_definitions_builtin_key_check;
ALTER TABLE local_field_definitions ADD CONSTRAINT local_field_definitions_builtin_key_check CHECK(builtin_key IN('created_at','last_completed_at','last_login_at'));
INSERT INTO local_field_definitions SELECT id,'thdmn.last_login_at','最終ログイン','datetime','thdmn',NULL,'last_login_at' FROM workspaces;
-- Preserve the previously fixed display as a removable optional selection for existing Accounts.
INSERT INTO local_field_bindings SELECT workspace_id,page_kind,page_id,'thdmn.last_login_at',false,true FROM structure_pages WHERE page_kind='account';
INSERT INTO structure_migrations(version) VALUES('017-last-login-field');
COMMIT;
