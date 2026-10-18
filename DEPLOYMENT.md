# Protected verification deployments

This repository prepares one existing Vercel project for Git-based builds. Deployment,
GitHub App linking and pushing are separate approval steps. No build runs a migration,
seed, SQL probe or authentication/permission provisioning operation.

## Reproduce locally

Use Node 24.x and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
```

On Windows without symlink privileges, installation can use
`--node-linker=hoisted --store-dir node_modules/.pnpm-store` with the same frozen lockfile.
The build writes only `public/` and `.build/`. It does not import the application,
read environment credentials, open DB connections, generate seed SQL or change source.
`public/` contains the authenticated shell, styles and dependency license notices.
`.build/` contains an offline API bundle and input inventory for verification, and
is not a deployment source entry. Vercel builds the committed `api/index.mjs`
function from its source imports and installed dependencies.

The generated UI always enters the PostgreSQL API shell; it does not start the
legacy local file-ledger client. `app-entry.mjs` remains included for local legacy
server compatibility. The published baseline source and its fictional local model
are retained; their runtime files and screenshots are excluded.

## Vercel settings to review before connection

- Existing single project; Framework Other, repository root, Node 24.x.
- `vercel.json` specifies frozen dependency installation, build, public output,
  one Node API entry, API rewrites and no-store/security headers.
- Keep authentication protection for **all** deployments and keep custom-domain
  publication off. No token, bypass key or GitHub Actions deployment secret is needed
  for the native Git integration.
- Review the function region against the existing Neon region. It is intentionally
  not overridden here: earlier local configuration and actual deployment differed.
- Connecting a repository can initiate a build. Configure Preview before connecting,
  then approve the first deployment. Main should remain the Production branch.
- Local tests do not prove Vercel's remote function tracing or protected OAuth flow;
  verify these after the separately approved first Preview build.

## Environment contract (names only)

| Name | Purpose | Preview treatment |
| --- | --- | --- |
| `DATABASE_URL` | Server-side pooled Postgres connection | Securely bind to the existing Neon development verification DB after approval; never expose to the browser or build |
| `NEON_AUTH_BASE_URL` | Neon Auth issuer/JWKS and browser SDK base URL | Configure for that same verification branch; the app deliberately returns this public URL to its browser |
| `VERCEL_URL` | Exact deployment hostname used by the Node adapter | Vercel-provided system variable; verify availability, never hardcode a generated hostname |
| `DATABASE_URL_UNPOOLED` | Existing direct connection setting | Current runtime does not read it; Preview build/runtime does not require a new direct connection setting |

No `.env` example with values, credential export, environment pull or secret-bearing
configuration is part of this repository. Vercel environment scope is separate from
Neon branch identity. Current Vercel Production is a protected verification deployment,
not evidence of a real-production database.

Initially, Preview and that existing Production-target verification deployment may
both use the **same Neon development DB**, fixed `thdmn_v02_trial` schema, fictional
seven-task fixture and existing human mapping. This shares task state, revisions,
operations and audit records. First acceptance checks should be read-only. No new
childAdder/editor grant is implied; existing seven tasks and permissions stay intact.
Use a separate Neon branch before independent destructive, schema or write testing
if preserving shared fixture state requires isolation. A second Vercel project is
not required for either option.

## Auth checks before Preview use

Review the branch's enabled Google provider, trusted redirect origins, SDK callback
URL, cookie/CORS behavior, issuer and audience, and current subject-to-principal
mapping. Keep default-deny application permissions. The SDK redirects to the current
URL; only explicitly reviewed Preview origins should be trusted. Do not assume the
existing integration automatically synchronizes future Git Preview origins, and do
not add a broad `*.vercel.app` trust rule. The API currently accepts only the exact
`VERCEL_URL` host; test unique deployment URL and branch/project aliases separately.
Vercel access protection and application Google authentication are both required.

## Tests and publication scope

Tests use synthetic signing keys, mocked fetch, fake Postgres and temporary local
files/loopback servers. They cover policy/current authority, creation/content,
revision conflicts, operation replay, session races, hidden-data projection, SQL
workspace scoping and the Node request boundary. The auth crypto test excludes the
old standalone preview page; the deployed shell is validated by build closure tests.
Build tests run twice with outbound network APIs blocked, compare artifact hashes
and source hashes, check secret sentinels and verify the compiled handler fails closed.
They do not perform real Google login or live PostgreSQL create/edit.

The exact source allowlist excludes operational evidence, identity-binding results,
deployment/probe/seed scripts, SQL drafts, images, logs, generated bundles and secrets.
Future source additions must be consciously added to `.gitignore`'s allowlist.
