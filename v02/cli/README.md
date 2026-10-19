# Task creation/edit CLI (v0.2)

Run with Node 24. The CLI uses the same snapshot and command API as the Web UI.
It does not connect directly to PostgreSQL, acquire credentials, log in, grant
permissions, or extract a browser session. Supply only an already authorized
caller token through `THDMN_CALLER_TOKEN`; never put it in arguments, input JSON,
journals or committed files. Deployment protection and app authentication are
separate checks. An app token alone does not satisfy Vercel deployment protection.
Do not disable protection or issue a new credential just to run these examples.

## Read-only readiness

```sh
node v02/cli/main.mjs check --url https://YOUR_AUTHORIZED_ORIGIN --backend api-v02 --workspace demo
```

One snapshot GET reports revision, visible count, and authorized create/edit/own
state task IDs. It prints no names, identities or tokens. Empty capability lists
mean there is no currently authorized target; the diagnostic grants nothing.

## Prepare and apply

Example `input.json` (synthetic placeholders; these IDs must already be authorized):

```json
[
  {"op":"create","id":"qa-cli-child","parentId":"qa-parent","name":"CLI検証Task","details":"合成テスト用","deps":[],"relationTiers":{"parent":"2","deps":{}}},
  {"op":"edit","taskId":"qa-cli-child","details":"CLIから更新"}
]
```

```sh
node v02/cli/main.mjs prepare input.json --journal plan.json --url https://YOUR_AUTHORIZED_ORIGIN --backend api-v02 --workspace demo
node v02/cli/main.mjs apply plan.json
```

`prepare` validates commands and reads the revision; it never POSTs. It reserves
a new journal and refuses to overwrite an existing one. `run` combines prepare
and apply. Journals contain operation IDs and content, so keep them private.
Only the token is omitted; the journal is not a public sample-data file.

The parent must grant the caller `childAdders`; content edits require `editors`.
Workspace `tasks:write` alone is insufficient. A child copies parent placement and
generated Policy. Creation does not automatically grant the creator edit rights.
Relation Tier must be strictly below the caller's authority in the existing Tier
ordering (for example caller Tier `1`, new relation Tier `2`). Snapshot capabilities
are advisory; the server rechecks current permissions on each operation/replay.

Each command is atomic; a batch is **not** one transaction. Earlier successes stay
committed if a later command fails. A stale revision returns 409; read current
state, review and prepare a new journal. A lost response should be retried using
the original journal/operation ID; do not regenerate IDs until the outcome is
known. Replay is idempotent but can still be refused after authority is revoked.

The CLI rejects malformed complete plans before the first POST. HTTP failures,
HTML login responses and redirects fail closed; they do not trigger credential
discovery or a protection workaround.

## Validation scope

`node scripts/test.mjs` uses synthetic auth, fake PostgreSQL and loopback HTTP.
It covers create/edit, Japanese content, 403/404 denial, 409 stale revision,
audit rollback, replay and CLI process execution. These checks do not establish
live PostgreSQL write success. The existing seven connection-check tasks are
separate from future README showcase data. Do not seed, rename or grant rights
to those records merely to make a test pass.
