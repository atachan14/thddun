# Typed structure DB/API implementation

The production application mounts the authenticated read-only page API and uses
server-derived completion in existing Task snapshots. Task creation writes the
legacy Task and typed parent atomically. Reference/Page/dependency management
commands remain disabled in production. The existing Google transport and rights
are reused; no credentials, identity mappings or grants are added by this code.

Migration files are never executed by build/startup. Apply them only through the
separately reviewed maintenance procedure. The original synthetic preview and
optional local SQL previews remain isolated from the real database.

## Deliverables and connection status

- `001-additive.sql`: additive typed Account/Group pages, real Task parents,
  reference placements, dependency registration history and private operation
  evidence. Workspace composite FKs and RESTRICT guards prevent accidental
  cross-workspace placement or cascade deletion. No live role or product deletion
  policy is inferred by those conservative guards. No roles/grants are added.
- `002-backfill.sql`: builds pages from existing spaces.kind, preserves existing
  parent_id for children, copies legacy references, and leaves entity prerequisites
  and their Tier unchanged. Root placement requires an explicit reviewed JSON
  manifest and reviewed preservation baseline. Before its writes, it locks the
  legacy tables and checks every count/fingerprint, stopping on any change.
  owner_space_id is never used to guess the actual parent.
- `repository.mjs`: pool-injected PostgreSQL implementation for page reads,
  reference add/remove and shared prerequisite add/unlink. It reuses existing
  current-principal authorization, task_read_spaces/memberships and B editors.
- `api.mjs`: authenticated Fetch API factory (production reads only). Authentication, allowed origins, verified
  CSRF and workspace read/write scopes must be supplied. Actor spoofing is rejected.
- `preflight.mjs`: read-only baseline count/fingerprint capture through an injected
  client; requires an explicit reviewed Task count. No row values are returned.
- `check-preservation.mjs`: independent before/after comparison of all captured
  legacy rows; only table names and counts appear in its report.
- `migration-test.mjs`: executes real migration SQL in local WASM PostgreSQL,
  separately checks nine fictional tasks and every legacy table before/after,
  rejects incomplete manifests/cycles, and tests workspace FKs/deletion guards.
- `api-test.mjs`: Fetch API -> repository -> actual local WASM PostgreSQL.
  Authentication provider and placement authorization remain synthetic callbacks.
  SQL parsing, constraints, transactions, audit rollback, revision and idempotency
  are exercised by the engine rather than a SQL-string mock.

No test used the remote nine tasks. The fixture's nine tasks are entirely fictional;
passing preservation tests is not a fresh integrity measurement of the live DB.
PGlite is not a managed Neon endpoint and does not verify PgBouncer, RLS/runtime
roles, production driver behavior or competing connections under real contention.

## Local SQL test setup

The optional test engine is separate from runtime/package dependencies and ignored
under `.local-test-tools/`. A fresh checkout can explicitly run:

```
node v02/structure/db/install-test-engine.mjs --install-pglite-0.5.10
node v02/structure/db/test.mjs
node scripts/test.mjs
```

Only the first command accesses the official npm registry. It pins PGlite0.5.10
and SHA-512, runs no package scripts, and refuses to overwrite an existing engine.
Alternatively THDMN_TEST_PGLITE_MODULE may name an already installed local module.
Tests use in-memory PostgreSQL, no sockets, credentials, env URL or remote fallback.
The normal24-program suite stays independent of this optional engine.

## API boundaries and authority

GET `/api/v02/structure/roots?workspace=ID` and
`/api/v02/structure/pages/{account|group|task}/{id}?workspace=ID` run in a transaction,
check the existing current principal (including disabled/revoked identity), and
project through existing read memberships. AccountPage currently means an existing
space whose kind is account; no account identity/ownership mapping is fabricated.
Reference placement never grants source read access. Hidden prerequisite names,
IDs, counts and details are stripped; only generic hold '前提待ち' is exposed.
Edit capabilities require current tasks:write plus the existing B editor entry.

POST `/api/v02/structure/commands` takes
`{workspaceId,operationId,expectedRevision,command}`. Supported commands:

- `{type:'addDependency',edge:{id,container,fromEntryId,toEntryId},tier:'10'}`
  requires readable sibling placements, readable A and existing B edit authority.
  A edit authority is not required. Existing checkItemChange Tier protection is
  preserved for new and removed dependency items; no stronger/equal Tier item can
  be changed by the B editor. Tier must be explicitly supplied in canonical
  form; no default or change to an existing dependency Tier is invented.
- `{type:'removeDependency',dependencyId}` requires B edit authority and readable
  endpoints. Hidden/absent relations return identical404, without exposing opaque
  relation IDs. A user who cannot read the source cannot target its unlink through
  this API; a separate hidden-edge management UX is not invented.
- `{type:'addReference',reference:{id,taskId,container}}` and
  `{type:'removeReference',referenceId}` require readable target/container plus an
  explicit `authorizePlacement(client,context,workspaceId,type,reference)` binding.
  Without the binding they fail503. The correct existing page/placement management
  authority is not established by current code and must be confirmed before wiring;
  no membership-as-editor or Task editor-as-page manager assumption is made.

Writes reauthorize before replay, lock the existing workspace revision row, validate
full entity/child cycles and duplicate pairs, then save the relation, operation,
private authorization evidence and existing audit record in one serializable
transaction. An audit failure rolls back everything. Registration evidence has no
FK to a reference, so reference removal never removes the real dependency. Unlink
is a separate explicit operation. Task/Policy/assignee records are not rewritten.

## Exact migration impact and activation gates

The migration adds tables/indexes and backfills ONLY those new tables. It does not
update/delete the existing nine tasks, owner_space_id, parent_id, Policy, Tier,
read spaces, membership, identity, credential, existing reference/placement rows,
workspace revision, operations or audit history. No old registration origins are
invented for existing entity dependencies. Existing rows must be independently
compared before/after, including all Policy and audit rows and the original seven.
`postcheck.sql` is a read-only count check, not a substitute for full preservation.

Later API writes intentionally append operations/audit and increment revision.
Explicit unlink alone changes task_dependencies. New references live in the typed
sidecar; deleting a sidecar reference intentionally preserves legacy rows. This
preparation is therefore NOT safe to activate alongside old graph-management
writes without a reviewed read/write cutover: the old UI would still read legacy
references, and existing createTask does not yet add structure_parents. Coverage
and legacy-parent mismatch checks fail closed rather than silently show stale data.
Do not enable the new API/UI until those paths are integrated and tested together.

Before remote application, separately approve all of these concrete scopes:

1. Read-only catalog/data preflight on the exact existing development branch,
   capture protected table counts/fingerprints and verify the live baseline of nine
   tasks and its Policy/audit. Review catalog differences from legacy-fixture.sql.
2. Supply/review the actual root Task -> typed page manifest and existing account
   space mapping. Confirm the existing placement-management rights to bind. Neither
   real mapping nor new grants are included here.
3. Approve a restore point/isolated test branch and maintenance window, direct
   connection for DDL, additive tables/indexes/FKs and read-only postchecks. No new
   credential is requested by this code; access must use an approved existing path.
4. Run001 then002 in order, stopping on missing mapping, cross-workspace data,
   duplicate/cycle or any legacy-row change. Locks can briefly block writers.
   In the same approved session, explicitly supply `thdmn.structure_baseline`
   (JSON from preflight) and `thdmn.structure_root_manifest` before running002.
   These JSON values are private review inputs; no real values are committed.
5. Review/create the application cutover (including existing Task creation and
   reference reads/writes), driver/role privileges, real concurrency tests and
   rollback. Before writes, rollback can leave unused additive tables in place;
   after writes, reconciliation is required. No automatic DROP/down script exists.
6. Approve any public Git push/deployment separately. Existing authentication,
   deployment protection and credentials are unchanged by this preparation.

Ownership transfer, real parent moves, Task/Page deletion and deletion cascades are
still out of scope. No endpoint or migration chooses their semantics. Real root mappings require an explicit reviewed manifest; placement-management
rights remain deliberately unbound while that feature is deferred.

## Independent local SQL browser preview

Run `node v02/structure/db/local-server.mjs` and open http://127.0.0.1:8770/ .
This creates a disposable PGlite database, migrates nine fictional tasks and
serves the real DB repository/API to the browser. The identity remains a clearly
marked synthetic editor; there is no real Google login or token. No placement
authorization binding is supplied, so reference add/remove remains disabled.
The preview bridge supplies Tier10 only for this synthetic demonstration and
labels that limitation. It does not establish a production default.

Verified in Chrome: add prerequisite revision5->6; reload retains it; opening
the actual Task from its reference shows both shared prerequisites; explicitly
unlinking the incomplete prerequisite moves revision6->7 and recalculates done.
This validates browser -> Fetch API -> SQL transaction -> projected response,
without remote DB or new credentials. The one embedded engine serializes local
transactions; real multi-connection contention is still a later integration test.
The database is discarded when the process stops.

## Read-only production integration

The approved first release exposes typed pages and retained references through
the existing authenticated application. `/api/v02/structure/commands` returns405
even for authenticated users. `structure-shell.mjs` disables all new management
controls, and links a Task to the existing content/state editor. Existing snapshot
reads include authoritative completion labels with hidden prerequisites redacted.
Existing createTask saves structure_parents in the same transaction; a failed
parent insert rolls back Task/Policy/operation/audit together. Confirmed private
prerequisites no longer invalidate unrelated child creation in structure mode;
read checks and Tier checks on newly selected dependencies remain in force.
`release-test.mjs` exercises the production application factory against actual
local PostgreSQL, including child edit/readback, management405 and atomic rollback.
