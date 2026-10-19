-- OFFLINE REVIEW FILE. No startup hook executes this migration.
-- Fixed trial namespace; stop if catalog differs from the reviewed baseline.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
SET LOCAL lock_timeout='3s';
DO $$ BEGIN
 IF to_regclass('thdmn_v02_trial.tasks') IS NULL OR to_regclass('thdmn_v02_trial.structure_migrations') IS NOT NULL THEN RAISE EXCEPTION 'Structure baseline mismatch'; END IF;
END $$;
-- Composite FKs add workspace consistency without rewriting existing rows.
CREATE UNIQUE INDEX structure_tasks_workspace_id ON tasks(workspace_id,id);
CREATE UNIQUE INDEX structure_spaces_workspace_kind_id ON spaces(workspace_id,kind,id);
CREATE TABLE structure_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE structure_pages(
 workspace_id text NOT NULL,page_kind text NOT NULL CHECK(page_kind IN('account','group')),page_id text NOT NULL,
 PRIMARY KEY(workspace_id,page_kind,page_id),
 FOREIGN KEY(workspace_id,page_kind,page_id) REFERENCES spaces(workspace_id,kind,id) ON DELETE RESTRICT);
CREATE TABLE structure_parents(
 workspace_id text NOT NULL,task_id text NOT NULL,parent_kind text NOT NULL CHECK(parent_kind IN('account','group','task')),
 parent_page_id text,parent_task_id text,PRIMARY KEY(workspace_id,task_id),
 CHECK((parent_kind='task' AND parent_task_id IS NOT NULL AND parent_page_id IS NULL) OR (parent_kind IN('account','group') AND parent_page_id IS NOT NULL AND parent_task_id IS NULL)),
 CHECK(task_id IS DISTINCT FROM parent_task_id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,parent_kind,parent_page_id) REFERENCES structure_pages(workspace_id,page_kind,page_id) ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,parent_task_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT);
CREATE TABLE structure_references(
 workspace_id text NOT NULL,id text NOT NULL,task_id text NOT NULL,container_kind text NOT NULL CHECK(container_kind IN('account','group','task')),
 container_page_id text,container_task_id text,PRIMARY KEY(workspace_id,id),
 CHECK((container_kind='task' AND container_task_id IS NOT NULL AND container_page_id IS NULL) OR (container_kind IN('account','group') AND container_page_id IS NOT NULL AND container_task_id IS NULL)),
 FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,container_kind,container_page_id) REFERENCES structure_pages(workspace_id,page_kind,page_id) ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,container_task_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT);
-- Entity dependencies remain canonical in task_dependencies. Origin is historical
-- text evidence, deliberately NOT a reference FK and never cascade-deleted.
CREATE TABLE structure_dependency_registrations(
 workspace_id text NOT NULL,id text NOT NULL,task_id text NOT NULL,prerequisite_id text NOT NULL,
 container_kind text NOT NULL CHECK(container_kind IN('account','group','task')),container_id text NOT NULL,
 from_entry_id text NOT NULL,to_entry_id text NOT NULL,PRIMARY KEY(workspace_id,id),UNIQUE(workspace_id,task_id,prerequisite_id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,prerequisite_id) REFERENCES tasks(workspace_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(task_id,prerequisite_id) REFERENCES task_dependencies(task_id,prerequisite_id) ON DELETE RESTRICT);
CREATE TABLE structure_operation_evidence(
 workspace_id text NOT NULL,subject_id text NOT NULL,operation_id text NOT NULL,evidence jsonb NOT NULL,
 PRIMARY KEY(workspace_id,subject_id,operation_id),
 FOREIGN KEY(workspace_id,subject_id,operation_id) REFERENCES operations(workspace_id,subject_id,operation_id) ON DELETE RESTRICT);
REVOKE ALL ON structure_operation_evidence,structure_migrations,structure_pages,structure_parents,structure_references,structure_dependency_registrations FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('001-structure-additive');
COMMIT;
