# Isolated v0.2 page and reference dependency contract

This read-only synthetic prototype is not mounted in the deployed app. It does
not change SQL, Google login, permissions, ownership, Task state or production
validation. The sample is separate from connection-check and README showcase data.

```sh
node v02/structure/contract-test.mjs
node v02/structure/local-server.mjs
```

Open http://127.0.0.1:8768/ . The preview uses an explicit synthetic identity,
loopback only, and no external API/DB/proxy. The API factory requires independent
authentication and page/Task read bindings; writes remain405.

## Confirmed user direction

Task references can be registered under a Task, AccountPage or GroupPage. A
reference can be brought beside another item so prerequisites across original
parents are expressed **between sibling placements**. Commit5115c4c's restriction
to the same actual Task parent was an incorrect conservative interpretation and
is superseded here. Whether references are eligible siblings is NOT undecided.

Account and Group remain terminal page kinds. Real Task parents and reference
containers are distinct: a real Task has one typed actual parent; a reference
has its own entry ID, target Task ID and page container. Opening a reference
navigates to the same real entity and its actual breadcrumbs. No copy, reparent,
ownership transfer or read grant is performed.

## Dependency representation and safety

`dependencyEdges` holds `{id, container, fromEntryId, toEntryId}`. Entry IDs are
`task:ID` for a directly contained actual Task or `reference:ID` for a reference
placed in that same container. The direction is prerequisite -> dependent.
Actual parents of the target entities may differ. Endpoints from different page
containers are invalid: place a reference first rather than using a direct
cross-page edge. References do not target other references.

Each endpoint resolves to a real Task ID for safety checks. Different placements
of the same real entity cannot depend on one another, including real-vs-reference
and reference-vs-reference. Dependency cycles are rejected across the union of
all reference placements after entity resolution, not just per visible page.
The existing child-completion safety relation (parent consumes child) is included
when detecting cycles; this prototype computes no completion result or state.
Duplicate exact placement pairs and edge IDs fail; parallel edges through distinct
references are represented separately without counting them as new Task entities.

`inspectDependencyProposal` is pure and nonmutating. It checks visible sibling
placements and structural/cycle constraints, but always returns writeReady=false
with required checks authority, audience and completion-scope. Structural validity
is NOT permission to save. No edge creation/editing endpoint is mounted.

## Privacy

Hidden or nonexistent pages/endpoints give the same404. A reference grants no
read access. Output contains an edge only when its page and both endpoint entries
are visible; hidden Task names/IDs, reference IDs, edge IDs and edge counts are not
returned. Tests verify that changing a hidden title or removing a hidden edge
leaves the visible projection exactly unchanged. Parent breadcrumbs stop at an
unreadable ancestor without rewriting parentage. No blocked/completion indicators
are emitted that could reveal a hidden prerequisite.

For future writes, effects on readers outside the placement page must be checked
before accepting a relation. It is unsafe to assume that because the current
editor can read both Tasks, every reader of a shared dependent can read its source.
Audience compatibility, mutation authority and hidden-global-constraint error
handling are unresolved write gates, not newly invented permission rules.

## Remaining decisions (with examples)

1. **Constraint effect / completion scope.** On AccountPage P, reference A precedes
   reference B; B's actual entity lives on GroupPage G. Must B on G and all other
   references also wait for A, or does the extra prerequisite apply only to B's
   placement on P? This contract records the selected placement pair but does not
   choose global-vs-local completion semantics or create per-reference work state.
2. **Multiple references to one entity.** If B1 and B2 both point to B, and only
   B1 has incoming A, should B2 show the constraint? Should an identical effective
   A->B edge on a second page be redundant or an independently managed relation?
   Both remain one real Task; counting/propagation is deliberately not implemented.
3. **Authority and audience.** Who may connect a readable reference to a shared B:
   page editor, source/target editor, or a combination? If B has a reader who
   cannot read A, can the edge be registered at all? No administrative/edit grant
   or hidden blocker behavior has been chosen.
4. **Placement/parent changes and deletion.** Removing or moving a reference that
   anchors an edge might reject the move, detach the edge, or retain an effective
   entity edge. Ownership transfer, real parent move and deletion cascade remain
   out of scope; no such write behavior is implemented.

Current deployed SQL has Task parent_id and owner_space_id but lacks typed terminal
Account/Group parent/placement-edge endpoints. Do not derive structural parent
from owner_space_id or migrate existing prerequisites automatically. The approved
reference-placement approach provides a way to present existing cross-parent
relations, but exact placement and live migration still require separate review.

Tests cover cross-actual-parent sibling placements, reference-to-reference edges,
entity self-dependency through distinct refs, cross-page reference cycles,
parent-completion cycles, explicit placement scope, hidden projection equivalence,
read-only API and fail-closed/unconfigured bindings. Production source closure,
permissions and data are untouched.
