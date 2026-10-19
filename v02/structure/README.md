# Isolated v0.2 page-structure contract

This read-only synthetic API/UI prototype is not mounted in the deployed app.
It does not change PostgreSQL, existing API behavior, Google login, permissions,
ownership or any live Task. Its small sample is neither the live connection-check
data nor the future README showcase dataset.

```sh
node v02/structure/contract-test.mjs
node v02/structure/local-server.mjs
```

Open http://127.0.0.1:8768/ . The local server binds only127.0.0.1, uses an explicit
synthetic identity, and serves only the named preview assets/read-only endpoints.
It is not an authentication implementation or a proxy to a protected deployment.

## Minimal structural representation

- Account and Group are terminal **page kinds**. No implicit Account->Group parent,
  administrative privilege or organizational hierarchy is defined here.
- Each real Task has exactly one typed parent `{kind: account|group|task, id}`.
  Following actual parents must end at an existing Account or Group; cycles and
  dangling parents are rejected. Parentage is separate from ownership/read policy.
- A reference has its own ID, one real target Task ID and one page container.
  Multiple references to one Task stay separate entries. They display the same
  target's title and link to its actual Task page, whose breadcrumbs follow its
  real parent. They do not copy/reparent the target or grant access to it.
- Prerequisites connect actual Task IDs with the **same typed actual parent**.
  Self edges, cycles, duplicates, parent/child edges and cross-parent edges fail.
  Displaying a reference beside another item does not itself make the target a
  sibling. This conservative interpretation needs explicit confirmation before
  any new write API/live migration if the intended rule is display-entry siblings.
- The view labels `実体Task` and `参照`; reference entries do not generate additional
  prerequisite edges or count as another Task entity.

## Read API and visibility boundary

`GET /api/v02/structure/roots` and `GET /api/v02/structure/pages/{kind}/{id}` are
factory contracts only. A production caller must bind authentication, model
loading and explicit page/Task read decisions; absent bindings return503.
Anonymous requests return401. Writes return405. Actor/query overrides are rejected.
Missing and inaccessible pages return the same404.

The prototype never derives permission from parentage, reference placement,
Account ownership or Group membership. Its injected access callbacks are test
inputs, not a proposed new product policy. Hidden reference targets are omitted;
an unreadable container cannot be opened; unreadable breadcrumb ancestors stop
the trail without leaking IDs/titles or changing a child's real parent. Access
does not propagate along references. The UI inserts titles using textContent.

## Compatibility and decisions still needed

The existing deployed v0.2 has parent_id for Task->Task and owner_space_id for
ownership, with null top-level parents. It has no typed Account/Group terminal
parent field. **Do not convert owner_space_id into structural parent automatically.**
Existing top-level prerequisite edges span different owners; doing so would turn
them into cross-parent edges and conflict with the sibling rule. Existing data
and legacy validators are unchanged by this isolated contract. Future migration
needs an approved structural placement for those Tasks, separately from owner.

Not decided/implemented:

1. Who may create/manage Account/Group pages, membership and roles; Account page
   privacy and Group page read permissions. No new admin grants inferred.
2. Whether the sibling restriction also permits links between displayed reference
   entries, or only actual-parent siblings as this safe read-only model uses.
3. Who may create/move references and whether a reference may be placed in its
   own target/descendant. Current rendering does not traverse references, so no
   automatic hierarchy expansion/deletion rule is inferred from such placement.
4. Root-Task creation, reparent/move authority and effect on prerequisites, copied
   Policy, read spaces, references and credential subtree scopes.
5. Ownership transfer and delete/archive behavior, including incoming references,
   children, dependencies and placements. No cascades or writes are implemented.
6. Placement/edge editing, validation/audit/idempotency integration and the live
   SQL migration shape. No schema changes or public push are part of this work.

Tests cover typed roots/parent cycles, actual siblings, duplicate independent
references, same-entity title projection, hidden targets/containers/ancestors,
fail-closed API and nonmutation. Real production authorization remains the
existing implementation until a separate approved integration.
