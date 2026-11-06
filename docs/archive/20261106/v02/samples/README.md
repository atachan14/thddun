# Shared fictional sample

The production entries are `/top.html?demo=manager#@sample_orion`,
`/top.html?demo=staff` and `/top.html?demo=guest`. They use the normal UI,
existing `demo` workspace and normal Policy engine. No separate tenant or
permission bypass is introduced. Group support and unrelated branding are excluded.

The enterprise blueprint contains 13 fictional Accounts, 80 Tasks, 57 prerequisite
edges and five references. Three additional shared Accounts supply Manager,
Staff and Guest entry points. Staff is under Manager; external rights held by
Staff do not propagate to Manager. Guest owns a separate sandbox hierarchy in the
same workspace. All sample credentials are random; only the existing scrypt
hashes are persisted. No password is exposed to visitors or logged by the seeds.

Shared sessions use separate `__Host-thdmn_demo_session` and
`__Host-thdmn_demo_csrf` Secure/HttpOnly/SameSite=Strict cookies. They retain
normal login, require CSRF for entry/writes/logout and use existing rate limits.
Only the three server-registered roles can enter. The server loads the registry
from the atomic seed completion record, never from client-supplied principal IDs.

All visitors can operate anything explicitly granted to a shared Account under
normal Policy. Assignment also grants the existing implicit add/view rights.
Grant/assignment controls warn and require acknowledgement for those recipients.
Knowing an ID confers no rights. Account edit/Policy/credential changes, reparent,
delete and ancestor/restore bypasses involving fixed shared Accounts are rejected
server-side and disabled in the snapshot-driven UI. Ordinary children remain
editable as allowed by Policy. No real user grants are added during seeding.

`seedEnterprise` and `seedPublicDemo` are operator-only functions, not API routes
or browser bundles. Local PGlite requires `localOnly:true`; approved hosted
execution requires `approvedHosted:true` and an explicitly selected workspace.
Before hosted execution, take a private consistent row/sequence backup and rehearse
the same seed against an isolated database. The transaction/savepoint adapter is
shared with isolated tests. Completion markers make reruns non-destructive and
reject partial/colliding seeds; each stage checks preservation of preexisting rows.
Hosted enterprise seeding without an owner does not select or grant a real user.

Rollback of code uses the prior commit/deployment. Sample data is additive and
may remain private after disabling public entry; do not purge rows as a code
rollback. Recovery from a seed error uses the saved backup only after review,
without overwriting changes made since the backup. No reset endpoint is exposed.

Run `node v02/samples/shared-demo-test.mjs` using the existing offline PGlite engine
to verify same-workspace denial, grants/revocation, protected Accounts, replay and
normal-session retention. Test data never falls back to a hosted connection.
