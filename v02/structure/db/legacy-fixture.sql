-- Synthetic test baseline only. Copied independently from the pre-structure schema.
CREATE SCHEMA thdmn_v02_trial;
SET search_path=thdmn_v02_trial,pg_catalog;
-- PROPOSAL ONLY. Not executed. No production RLS or authentication policies yet.
-- All identifiers below are stable IDs; names/paths are not identities.

CREATE TABLE workspaces(id text PRIMARY KEY);
CREATE TABLE workspace_revisions(workspace_id text PRIMARY KEY REFERENCES workspaces(id),revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0));
CREATE TABLE accounts(id text PRIMARY KEY, external_subject text UNIQUE NOT NULL, display_name text NOT NULL,disabled boolean NOT NULL DEFAULT false);
-- Adopted identity boundary: humans authenticate with Google; services act as themselves.
CREATE TABLE principals(id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN('human','service')),display_name text NOT NULL,account_id text UNIQUE REFERENCES accounts(id),owner_account_id text REFERENCES accounts(id),disabled boolean NOT NULL DEFAULT false,CHECK((kind='human' AND account_id IS NOT NULL AND owner_account_id IS NULL) OR (kind='service' AND account_id IS NULL AND owner_account_id IS NOT NULL)));
CREATE TABLE service_credentials(id text PRIMARY KEY,principal_id text NOT NULL REFERENCES principals(id),secret_hash text NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,issued_by_account_id text NOT NULL REFERENCES accounts(id));
CREATE TABLE credential_workspaces(credential_id text REFERENCES service_credentials(id),workspace_id text REFERENCES workspaces(id),PRIMARY KEY(credential_id,workspace_id));
CREATE TABLE credential_actions(credential_id text REFERENCES service_credentials(id),action text NOT NULL,PRIMARY KEY(credential_id,action));
CREATE TABLE principal_permissions(workspace_id text REFERENCES workspaces(id),principal_id text REFERENCES principals(id),action text NOT NULL,PRIMARY KEY(workspace_id,principal_id,action));
CREATE TABLE spaces(id text PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),kind text NOT NULL CHECK(kind IN('account','group')),name text NOT NULL);
CREATE TABLE memberships(space_id text REFERENCES spaces(id),principal_id text REFERENCES principals(id),PRIMARY KEY(space_id,principal_id));
CREATE TABLE tasks(id text PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),owner_space_id text NOT NULL REFERENCES spaces(id),parent_id text REFERENCES tasks(id),name text NOT NULL,details text NOT NULL DEFAULT '',custom_fields jsonb NOT NULL DEFAULT '{}',CHECK(parent_id IS NULL OR parent_id<>id));
CREATE TABLE task_read_spaces(task_id text REFERENCES tasks(id),space_id text REFERENCES spaces(id),PRIMARY KEY(task_id,space_id));
CREATE TABLE task_policy(task_id text REFERENCES tasks(id),field text CHECK(field IN('childAdders','editors','completers')),principal_id text REFERENCES principals(id),tier numeric(48,18) NOT NULL,PRIMARY KEY(task_id,field,principal_id));
CREATE TABLE task_participants(task_id text REFERENCES tasks(id),principal_id text REFERENCES principals(id),tier numeric(48,18) NOT NULL,PRIMARY KEY(task_id,principal_id));
CREATE TABLE task_child_rules(task_id text REFERENCES tasks(id),field text NOT NULL,principal_id text REFERENCES principals(id),tier numeric(48,18) NOT NULL,PRIMARY KEY(task_id,field,principal_id));
CREATE TABLE task_dependencies(task_id text REFERENCES tasks(id),prerequisite_id text REFERENCES tasks(id),tier numeric(48,18) NOT NULL,PRIMARY KEY(task_id,prerequisite_id),CHECK(task_id<>prerequisite_id));
CREATE TABLE task_parent_tiers(task_id text PRIMARY KEY REFERENCES tasks(id),tier numeric(48,18) NOT NULL);
CREATE TABLE assignee_states(task_id text REFERENCES tasks(id),principal_id text REFERENCES principals(id),state text NOT NULL CHECK(state IN('todo','doing','hold','done')),changed_at timestamptz NOT NULL,changed_by text NOT NULL REFERENCES principals(id),PRIMARY KEY(task_id,principal_id));
CREATE TABLE task_references(id text PRIMARY KEY,task_id text NOT NULL REFERENCES tasks(id),container_space_id text REFERENCES spaces(id),container_task_id text REFERENCES tasks(id),CHECK((container_space_id IS NULL)<>(container_task_id IS NULL)));
CREATE TABLE placements(id text PRIMARY KEY,view_id text NOT NULL,task_id text REFERENCES tasks(id),reference_id text REFERENCES task_references(id),x double precision NOT NULL,y double precision NOT NULL,CHECK((task_id IS NULL)<>(reference_id IS NULL)));
CREATE TABLE doc_references(id text PRIMARY KEY,task_id text NOT NULL REFERENCES tasks(id),repository_id text NOT NULL,relative_path text NOT NULL,commit_id text);
CREATE TABLE operations(workspace_id text REFERENCES workspaces(id),subject_id text NOT NULL REFERENCES principals(id),operation_id text NOT NULL,fingerprint text NOT NULL,response jsonb NOT NULL,PRIMARY KEY(workspace_id,subject_id,operation_id));
CREATE TABLE audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,workspace_id text REFERENCES workspaces(id),subject_id text NOT NULL REFERENCES principals(id),operation_id text NOT NULL,kind text NOT NULL,actor_kind text NOT NULL CHECK(actor_kind IN('human','service')),credential_id text REFERENCES service_credentials(id),managing_account_id text REFERENCES accounts(id),at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Cross-workspace FK consistency, owner/parent rules, cycle checks, read projections,
-- RLS/roles, indexes, migration history and down/restore procedure remain design work.
-- Do not run this draft against a real database.
