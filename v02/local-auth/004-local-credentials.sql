-- Local development preparation ONLY. Never run by the deployed application.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
CREATE TABLE local_auth_credentials(
 username text PRIMARY KEY CHECK(username ~ '^[a-z][a-z0-9_-]{3,19}$'),
 principal_id text UNIQUE NOT NULL REFERENCES principals(id),
 password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE local_auth_sessions(
 token_hash text PRIMARY KEY,csrf_hash text NOT NULL,
 principal_id text NOT NULL REFERENCES principals(id),
 expires_at timestamptz NOT NULL,revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE local_auth_limits(
 key text PRIMARY KEY,started_at timestamptz NOT NULL,attempts integer NOT NULL CHECK(attempts>0));
CREATE TABLE local_page_grants(
 workspace_id text NOT NULL REFERENCES workspaces(id),page_kind text NOT NULL CHECK(page_kind IN('account','task')),
 page_id text NOT NULL,principal_id text NOT NULL REFERENCES principals(id),
 permission text NOT NULL CHECK(permission IN('view','create','edit')),
 PRIMARY KEY(workspace_id,page_kind,page_id,principal_id));
REVOKE ALL ON local_auth_credentials,local_auth_sessions,local_auth_limits,local_page_grants FROM PUBLIC;
INSERT INTO structure_migrations(version) VALUES('004-local-credentials-policy-core');
COMMIT;
