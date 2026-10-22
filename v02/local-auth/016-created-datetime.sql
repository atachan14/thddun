-- User-approved local addition. Missing dates are application-time backfill, not history.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
INSERT INTO local_field_definitions SELECT id,'thdmn.created_datetime','作成日時','datetime','thdmn',NULL,'created_at' FROM workspaces;
INSERT INTO local_page_metadata(kind,entity_id) SELECT 'task',id FROM tasks ON CONFLICT DO NOTHING;
INSERT INTO local_page_metadata(kind,entity_id) SELECT 'account',id FROM spaces WHERE kind='account' ON CONFLICT DO NOTHING;
-- CURRENT_TIMESTAMP is one transaction timestamp, also recorded in structure_migrations.
UPDATE local_page_metadata SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL;
INSERT INTO structure_migrations(version) VALUES('016-created-datetime');
COMMIT;
