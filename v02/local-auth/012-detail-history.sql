BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_page_metadata(kind text NOT NULL CHECK(kind IN('account','task')),entity_id text NOT NULL,created_at timestamptz,last_login_at timestamptz,last_completed_at timestamptz,details text NOT NULL DEFAULT '',PRIMARY KEY(kind,entity_id));
-- Only genuinely recorded Account signup times are recoverable. Historical Task dates remain NULL.
INSERT INTO local_page_metadata(kind,entity_id,created_at) SELECT 'account',o.page_id,c.created_at FROM account_page_owners o LEFT JOIN local_auth_credentials c ON c.principal_id=o.principal_id ON CONFLICT DO NOTHING;
INSERT INTO local_page_metadata(kind,entity_id) SELECT 'task',id FROM tasks;
CREATE FUNCTION record_page_creation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_TABLE_NAME='tasks' THEN INSERT INTO local_page_metadata(kind,entity_id,created_at) VALUES('task',NEW.id,CURRENT_TIMESTAMP);ELSIF NEW.kind='account' THEN INSERT INTO local_page_metadata(kind,entity_id,created_at) VALUES('account',NEW.id,CURRENT_TIMESTAMP);END IF;RETURN NEW;END $$;
CREATE TRIGGER record_task_creation AFTER INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION record_page_creation();
CREATE TRIGGER record_account_creation AFTER INSERT ON spaces FOR EACH ROW EXECUTE FUNCTION record_page_creation();
CREATE FUNCTION record_task_completion() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE taskid text; actor text; previous_complete boolean; current_complete boolean; BEGIN
taskid=CASE WHEN TG_OP='DELETE' THEN OLD.task_id ELSE NEW.task_id END;actor=CASE WHEN TG_OP='DELETE' THEN OLD.principal_id ELSE NEW.principal_id END;
SELECT count(*)>0 AND bool_and(state='done') INTO current_complete FROM assignee_states WHERE task_id=taskid;
IF TG_OP='INSERT' THEN SELECT count(*)>0 AND bool_and(state='done') INTO previous_complete FROM assignee_states WHERE task_id=taskid AND principal_id<>actor;
ELSE SELECT count(*)>0 AND bool_and(state='done') INTO previous_complete FROM (SELECT state FROM assignee_states WHERE task_id=taskid AND principal_id<>actor UNION ALL SELECT OLD.state) states;END IF;
IF current_complete AND NOT previous_complete THEN INSERT INTO local_page_metadata(kind,entity_id,last_completed_at) VALUES('task',taskid,CURRENT_TIMESTAMP) ON CONFLICT(kind,entity_id) DO UPDATE SET last_completed_at=EXCLUDED.last_completed_at;END IF;RETURN NULL;END $$;
CREATE TRIGGER record_task_completion AFTER INSERT OR UPDATE OR DELETE ON assignee_states FOR EACH ROW EXECUTE FUNCTION record_task_completion();
REVOKE ALL ON local_page_metadata FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('012-detail-history');
COMMIT;
