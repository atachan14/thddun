# Shared entity dependencies: isolated synthetic implementation

The typed contract/browser renderer is shared by the authenticated read-only
production page view. The standalone local-server described below still uses an
explicit synthetic identity and process-local memory. Production management is
disabled; see db/README.md for the read-only integration and migration procedure.

Run `node v02/structure/local-server.mjs` and open http://127.0.0.1:8768/ .
For a synthetic reader without access to the brief prerequisite, run
`node v02/structure/local-server.mjs 8769 --private` and open port8769 instead.
These are separate disposable models. Stop the process to discard mutations.
Run `node scripts/test.mjs` for the complete regression suite.

## Confirmed behavior

- References can be placed under Task, AccountPage or GroupPage. Dependency
  registration requires sibling placements; actual Task parents may differ.
- A -> B resolves to real entities and affects B and all its references. Only
  current B edit authority is required; A edit authority is not required.
- Task completion requires all assignees, actual children and shared
  prerequisites to be complete. Stored assignee states are never rewritten.
  All assignees done with an unfinished child retains child-pending hold.
  All assignees done with an unfinished prerequisite uses the same hold color.
- Readers without access to a prerequisite see only generic '前提待ち' for that
  hidden relation. No hidden names, task/reference/relation IDs, counts, origin
  placements, internal assignee/child states or relation-removal controls appear.
  Visible prerequisites retain their normal names and separate unlink controls.
- Removing a reference removes only that placement. Its real Task, all other
  references and every entity dependency remain. No automatic unlink/cascade.
- Explicit dependency unlink is a different command requiring B edit authority.
  It leaves references and Task data unchanged and recalculates completion.
  The UI labels the operations separately and explains that reference removal
  keeps prerequisites. References never grant access or change actual parents.

## Representation and mutation boundaries

Persisted synthetic edges contain immutable real prerequisiteTaskId/taskId plus
registration container/fromEntryId/toEntryId evidence. The constructor resolves
older placement-only fixtures before any mutation. Evidence may outlive a removed
reference; it does not define relation lifetime. Live endpoints, if still present,
must match the canonical entity IDs. Existing Task/page deletion is not implemented.

The memory store checks revision atomically, journals operation IDs and audits
successful operations. Replays recheck current authority. Entity self-dependency,
duplicate effective pairs (including alternate references), cross-reference cycles
and cycles through actual-child completion fail before mutation. A retained edge
continues to participate after its reference is removed. Hidden and nonexistent
mutation targets return identical404 with generic errors. No hidden cycle paths
are returned.

POST commands are /api/v02/structure/dependencies (add),
/api/v02/structure/references/remove (removeReference), and
/api/v02/structure/dependencies/remove (removeDependency). Payload type cannot
change the command selected by the route. Authentication, CSRF verification,
explicit read/edit/reference-removal bindings and persistence are required.
Missing bindings fail closed. canShareDependency remains an explicit integration
safety binding; it must not require that every B reader can read A, since the
approved generic hidden-prerequisite projection handles that case. The preview
binds it true for synthetic data only. It does not grant or define live roles.
Reference-removal permission also uses an explicit synthetic binding; production
must bind it to the existing placement-management policy, without adding grants.

## Reviewed migration procedure

1. Review the existing schema and approved rights without altering live data.
   Separate entity dependency storage from reference placement storage. Keep the
   existing Task relationships; do not infer structural parentage from owner_space.
2. Stage canonical source/target Task IDs, scoped to the workspace, with a unique
   effective pair constraint and foreign keys to real Tasks. Registration evidence
   can become nullable or historical. A reference FK must not cascade-delete the
   entity dependency. Task/page deletion policy remains a separate scope.
3. Backfill placement-only edges by resolving existing endpoints. Stop on missing,
   mismatched, duplicate or cyclic rows and report for review; do not discard or
   silently rewrite them. Compare completion before/after on an isolated copy.
4. Add separate authenticated, idempotent transactions for reference removal and
   explicit relation unlink. Bind current existing reference-management rights
   and B-edit rights; keep revision, audit and cycle validation atomic under
   appropriate locking/isolation. No permission expansion is needed by this model.
5. Compute full completion within trusted server scope, then project hidden
   prerequisites to generic waiting. Never expose the internal graph or hidden
   names/counts to browser/CLI. Test revoked rights and private endpoint equivalence.
6. Review the migration SQL, rollback/backfill checks and integration changes before
   applying to an isolated development branch. Real DB migration and any public
   push/deployment require separate authorization and are not part of this work.

Validation includes 24 synthetic test programs, repeated reproducible builds with
outbound network blocked, and PC/mobile390px browser checks. Pure tests cover
completion/reopen after prerequisite changes; browser checks cover reference
removal retaining hold, explicit unlink changing completion, re-add returning to
hold, and hidden-name suppression. No real DB, Google login or deployment was
used to verify this isolated prototype.

## Next local preparation

The `db/` directory contains additive migration/backfill SQL,
current-principal/read/editor/Tier checks, and independent local PostgreSQL tests.
See [db/README.md](db/README.md) for the exact connection status and approval gates.
The standalone preview above remains memory-only. Production uses the DB adapter
for authenticated read-only pages and keeps new management operations disabled.
