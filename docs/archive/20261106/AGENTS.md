# Working on thddun

Read README.md and docs/README.md first; docs/STATUS.md separates public features from preserved local experiments.

Canonical checkout: G:\source\repos\2026\thddun. Keep origin/main as the production baseline. This is an independent clone; do not edit the old reference/worktrees as if they were current.

Run node scripts/test.mjs and node scripts/build.mjs with Node 24 and prepared dependencies. Tests use isolated data only; never substitute production DATABASE_URL for a missing test engine. Build must not connect to a DB or seed data.

Preserve server-side Policy, same-workspace privacy, shared-principal protections, namespace/cookie compatibility, optimistic concurrency and original reference identities. Knowing a public ID grants no rights.

Do not merge preserved Group/branding or old dirty-tree prototypes wholesale. Do not implement Knowledge/PKB proposals as settled requirements.

Never commit .local-test-tools, runtime data, credentials, backups, generated bundles or private samples. Do not dump process command lines or extract cached credentials. Use already authorized connectors without printing secret values.

A main push triggers existing production deployment. Confirm the authorized publication scope and inspect remote changes first; do not force-push. DB/auth/provider/domain changes are separate actions, not build steps. Honor explicit current user authorization without repeating unnecessary approvals.
