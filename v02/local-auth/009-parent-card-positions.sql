BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_card_positions(workspace_id text NOT NULL REFERENCES workspaces(id),parent_kind text NOT NULL CHECK(parent_kind IN ('account','task')),parent_id text NOT NULL,child_kind text NOT NULL CHECK(child_kind IN ('account','task')),child_id text NOT NULL,container_kind text NOT NULL CHECK(container_kind IN ('account','task')),container_id text NOT NULL,view_kind text NOT NULL CHECK(view_kind IN ('drilldown','dashboard')),x double precision NOT NULL CHECK(x>=0 AND x<=100000),y double precision NOT NULL CHECK(y>=0 AND y<=100000),PRIMARY KEY(workspace_id,parent_kind,parent_id,child_kind,child_id,container_kind,container_id,view_kind));
REVOKE ALL ON local_card_positions FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('009-parent-owned-card-positions');COMMIT;
