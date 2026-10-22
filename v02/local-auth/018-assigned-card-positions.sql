BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
-- Virtual assigned-page layout only. These rows never define hierarchy or Task state.
CREATE TABLE local_assigned_card_positions(workspace_id text NOT NULL REFERENCES workspaces(id),account_id text NOT NULL,task_id text NOT NULL,view_kind text NOT NULL CHECK(view_kind IN('drilldown','dashboard')),x double precision NOT NULL CHECK(x>=-100000 AND x<=100000),y double precision NOT NULL CHECK(y>=-100000 AND y<=100000),PRIMARY KEY(workspace_id,account_id,task_id,view_kind));
REVOKE ALL ON local_assigned_card_positions FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('018-assigned-card-positions');
COMMIT;
