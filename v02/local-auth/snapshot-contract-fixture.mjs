import fs from 'node:fs/promises';
import { openTestDatabase, legacyFixture, migrate, localPool } from '../structure/db/test-support.mjs';
import { PolicyRepository } from './policy-repository.mjs';

// Fictional, deterministic projection fixture. No authentication credentials are usable.
export async function snapshotContractFixture() {
  const db = await openTestDatabase();
  try {
    await legacyFixture(db);
    await migrate(db);
    await db.query('UPDATE tasks SET custom_fields=$1 WHERE id=$2', [{ zero: 0, flag: false, notes: { text: 'fictional' } }, 'task-0']);
    await db.exec(await fs.readFile(new URL('../stage-one/003-stage-one.sql', import.meta.url), 'utf8'));
    for (const file of ['004-local-credentials.sql', '005-local-policy.sql', '006-local-task-trash.sql', '007-public-reference-ids.sql', '008-account-trash.sql', '009-parent-card-positions.sql', '010-signed-card-positions.sql', '012-detail-history.sql', '014-unified-identifiers.sql', '015-fields.sql', '016-created-datetime.sql', '017-last-login-field.sql', '018-assigned-card-positions.sql']) {
      await db.exec(await fs.readFile(new URL(file, import.meta.url), 'utf8'));
    }
    await db.exec("INSERT INTO account_page_owners(workspace_id,page_id,principal_id) VALUES('fixture','account-page','editor'); INSERT INTO accounts VALUES('outsider-account','verified-outsider','Fictional hidden colleague',false); INSERT INTO principals(id,kind,display_name,account_id) VALUES('outsider','human','Fictional hidden colleague','outsider-account'); INSERT INTO principal_permissions VALUES('fixture','outsider','tasks:read'),('fixture','outsider','tasks:write');");
    for (const principal of ['reader', 'outsider']) {
      await db.query("INSERT INTO spaces(id,workspace_id,kind,name) VALUES($1,'fixture','account',$2)", ['home-' + principal, 'Fictional ' + principal]);
      await db.query("INSERT INTO structure_pages VALUES('fixture','account',$1)", ['home-' + principal]);
      await db.query("INSERT INTO account_page_owners(workspace_id,page_id,principal_id) VALUES('fixture',$1,$2)", ['home-' + principal, principal]);
      await db.query('INSERT INTO memberships VALUES($1,$2)', ['home-' + principal, principal]);
    }
    for (const principal of ['editor', 'reader', 'outsider']) await db.query('INSERT INTO local_auth_credentials(username,principal_id,password_hash,created_at) VALUES($1,$1,$2,$3)', [principal, 'fixture-not-for-login', '2020-01-01T00:00:00Z']);
    await db.exec("INSERT INTO local_page_grants VALUES('fixture','task','task-0','reader','view'),('fixture','task','task-7','reader','manage'),('fixture','task','task-4','outsider','view'); INSERT INTO task_policy VALUES('task-3','completers','reader',10),('task-8','completers','outsider',10); INSERT INTO assignee_states VALUES('task-3','reader','done',CURRENT_TIMESTAMP,'reader'),('task-8','outsider','todo',CURRENT_TIMESTAMP,'outsider');");
    await db.exec("INSERT INTO local_field_definitions VALUES('fixture','fixture-required','Fictional required','number','account','account-page',NULL); INSERT INTO local_field_bindings VALUES('fixture','account','account-page','fixture-required',true,true),('fixture','task','task-0','fixture-required',false,true); INSERT INTO local_field_values VALUES('fixture','account','account-page','fixture-required','7'),('fixture','task','task-0','fixture-required','0'); INSERT INTO local_field_rules VALUES('fixture','account','account-page','fixture-required',true,true); INSERT INTO local_card_positions VALUES('fixture','account','account-page','task','task-0','account','account-page','drilldown',-120,35);");
    await db.exec("UPDATE local_page_metadata SET created_at='2020-01-01T00:00:00Z',last_login_at=NULL,last_completed_at=NULL; UPDATE local_page_metadata SET last_login_at='2020-01-02T03:04:05Z' WHERE kind='account' AND entity_id='home-reader'; UPDATE local_page_metadata SET last_completed_at='2020-01-03T04:05:06Z' WHERE kind='task' AND entity_id='task-1';");
    const { backfillPublicIds } = await import('./public-ids.mjs');
    await backfillPublicIds(db);
    const pool = localPool(db), repository = new PolicyRepository(pool);
    const context = principal => ({ subjectId: principal, identitySubjectId: 'verified-' + principal, principalKind: 'human', workspaceIds: ['fixture'], scopes: ['tasks:read', 'tasks:write'], csrfVerified: true });
    return { db, pool, repository, context };
  } catch (error) { await db.close(); throw error; }
}
