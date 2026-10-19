-- READ-ONLY postcheck: expect zero violations, full coverage and same protected
-- table hashes/counts as captured BEFORE migration by the independent verifier.
SELECT (SELECT count(*) FROM thdmn_v02_trial.tasks) AS tasks,
       (SELECT count(*) FROM thdmn_v02_trial.structure_parents) AS parents,
       (SELECT count(*) FROM thdmn_v02_trial.task_references) AS legacy_references,
       (SELECT count(*) FROM thdmn_v02_trial.structure_references) AS references,
       (SELECT count(*) FROM thdmn_v02_trial.task_policy) AS policy_rows,
       (SELECT count(*) FROM thdmn_v02_trial.audit) AS audit_rows,
       (SELECT revision FROM thdmn_v02_trial.workspace_revisions WHERE workspace_id=$1) AS revision;
-- No down migration deleting new tables/data is automated. Before activation,
-- application rollback leaves the additive tables unused and preserves originals.
-- After any structure writes, rollback requires a reviewed data reconciliation.
