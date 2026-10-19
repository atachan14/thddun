# Shared entity dependency prototype

This isolated synthetic API/UI is not mounted in production and never connects
to a database. Run `node v02/structure/local-server.mjs`, then open
http://127.0.0.1:8768/ . Changes last only for the process lifetime.

## Confirmed semantics

References may be placed under Task, AccountPage or GroupPage. A dependency is
registered between sibling placements; actual parents may differ. Endpoints
resolve to real Task IDs. A -> B affects B and all references to B everywhere.
Only B edit authority is required; A edit authority is not required. References
never grant access, reparent, copy, or create independent work states.

Registration retains container/fromEntryId/toEntryId plus resolved real IDs.
Repeated effective A -> B pairs return409, including alternate references.
Entity self-dependencies, cross-reference cycles and cycles through child
completion are rejected globally before committing. The synthetic store checks
revision atomically, journals operation IDs, and checks current B authority even
on replay. The API requires authentication, CSRF verification and explicit read,
B-edit, sharing-safety and persistence bindings; absent bindings fail closed.

Completion is derived from all assignees, actual children and shared prerequisites.
All must be complete. Assignee work states are never rewritten. All assignees done
with an unfinished child retains the existing hold color. When assignees and
children are done but a prerequisite is unfinished, completion is false and the
UI uses a neutral dashed `prerequisite-pending` placeholder. The final state/color
for this case is undecided; no hold/doing work state has been assigned.

## Privacy and remaining decisions

Hidden and nonexistent endpoints return identical404 responses. Hidden titles,
IDs and edges are filtered. Derived completion is withheld for partially visible
models, avoiding disclosure of hidden blockers. This deliberately conservative
synthetic behavior is not an adopted live authorization policy.

An explicit canShareDependency binding must confirm global sharing safety before
mutation. The sample binds this true only because every synthetic task is visible.
How live B readers who cannot read A should be handled remains undecided. This
check does not impose source edit authority or introduce roles/grants.

Reference removal/move, relation lifetime and deletion cascades are undecided.
No such commands exist. Keeping placement evidence today is not a decision about
what should happen after future removal. Page management, ownership transfer,
real parent moves, live schema migration and production mounting remain out of
scope. Existing data, authentication and deployment are unchanged.

Validation: `node scripts/test.mjs`. Tests cover shared completion, child hold,
reference equivalence, B-only edit authority, duplicate/self/cycle rejection,
idempotency, revoked authority, stale revision, private endpoints, CSRF and
unconfigured writes. No live database or credentials are used.
