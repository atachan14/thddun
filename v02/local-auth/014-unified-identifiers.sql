-- Local-only additive constraint migration. Existing IDs/passwords/session rows are never rewritten.
BEGIN;
SET LOCAL search_path=thdmn_v02_trial,pg_catalog;
DO $body$ BEGIN
 IF EXISTS(SELECT 1 FROM local_auth_credentials WHERE username !~ '^[a-z][a-z0-9_-]{3,19}$') THEN RAISE EXCEPTION 'Existing AccountID is incompatible; explicit decision required'; END IF;
 IF EXISTS(SELECT lower(username) FROM local_auth_credentials GROUP BY lower(username) HAVING count(*)>1) THEN RAISE EXCEPTION 'Case-fold AccountID collision'; END IF;
END $body$;
ALTER TABLE local_auth_credentials DROP CONSTRAINT local_auth_credentials_username_check;
ALTER TABLE local_auth_credentials ADD CONSTRAINT local_auth_credentials_username_check CHECK(username ~ '^[a-z][a-z0-9_-]{3,19}$');
CREATE UNIQUE INDEX local_auth_account_id_lower_unique ON local_auth_credentials(lower(username));
CREATE FUNCTION protect_account_identifier() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN IF NEW.username IS DISTINCT FROM OLD.username THEN RAISE EXCEPTION 'AccountID is immutable'; END IF;RETURN NEW;END $body$;
CREATE TRIGGER protect_account_identifier BEFORE UPDATE OF username ON local_auth_credentials FOR EACH ROW EXECUTE FUNCTION protect_account_identifier();
INSERT INTO structure_migrations(version) VALUES('014-unified-identifiers');
COMMIT;
