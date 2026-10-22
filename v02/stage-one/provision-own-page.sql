-- REVIEW TEMPLATE ONLY. No auth account, credential, principal or Task is created here.
-- Bind $1=reviewed workspace ID, $2=existing verified HUMAN principal ID,
-- $3=new globally unique page ID, $4=page display name. Never derive IDs from email.
-- Execute through an explicit transaction/client after approving exact values.
-- Required prior migrations: structure 001/002 and stage-one 003.
-- Stop unless exactly one enabled human and both existing workspace permissions match.
SELECT p.id FROM thdmn_v02_trial.principals p
JOIN thdmn_v02_trial.accounts a ON a.id=p.account_id
WHERE p.id=$2 AND p.kind='human' AND NOT p.disabled AND NOT a.disabled
AND (SELECT count(*) FROM thdmn_v02_trial.principal_permissions x
 WHERE x.principal_id=p.id AND x.workspace_id=$1 AND x.action IN('tasks:read','tasks:write'))=2;
-- Operator must assert exactly one row, check existing page/owner mappings, then:
INSERT INTO thdmn_v02_trial.spaces(id,workspace_id,kind,name) VALUES($3,$1,'account',$4);
INSERT INTO thdmn_v02_trial.structure_pages VALUES($1,'account',$3);
INSERT INTO thdmn_v02_trial.memberships VALUES($3,$2);
INSERT INTO thdmn_v02_trial.account_page_owners(workspace_id,page_id,principal_id) VALUES($1,$3,$2);
-- Commit only after checking mapping is unique. No existing Task parent changes.
