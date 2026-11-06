> Current handoff: [docs/README.md](docs/README.md). The sections below retain stage-specific rollout/review history; use docs/STATUS.md and actual Git/deployment SHA for present status.

# Protected main-only verification deployment

Use one existing Vercel project, its protected Production deployment and existing
Neon development DB/Auth. Publish reviewed changes to main. The temporary local
migration branch is review preparation, not a required long-term branch workflow.
Main publishing, Git connection and first deployment need separate authorization.
No build runs SQL, seeds, provisioning or task/permission changes.

## Reproduce locally

Use Node 24.x and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
```

Windows without symlink privileges can add
`--node-linker=hoisted --store-dir node_modules/.pnpm-store` at installation.
Build reads source and installed dependencies, not credentials, and writes only
public/ and .build/. It never imports the running app or opens a DB connection.
Static text newlines are normalized. Public output contains the authenticated
shell, styles and full third-party notices, without sourcemaps/fixtures/legacy
file-ledger code. .build/ is an offline API test bundle and source-input inventory.
Vercel builds committed api/index.mjs through normal Node source tracing.
app-entry.mjs remains tracked for the local legacy server.

## Exact host and callback contract

The existing stable project alias is:

`https://thdmn-aklius14pg-8355s-projects.vercel.app`

It is already assigned to this project and already trusted by existing Neon Auth.
The project's verified Production domain is `https://thdmn.vercel.app`; that exact
domain is also already Auth-trusted and accepted as a stable entry. Vercel's
VERCEL_PROJECT_PRODUCTION_URL selects this shorter domain, not the longer alias.
Start Google login there: the unchanged SDK callbackURL (location.href) returns to
that same existing trusted origin. No new Google app/provider, credential or Auth
origin is required for this route. The provider callback stays on existing Neon Auth.

VERCEL_URL denotes the current immutable deployment hostname, which changes per
build. The old immutable URL still identifies the old deployment, not future main
updates. Use the stable alias routinely; unique deployment hosts are diagnostics.

The server accepts only the exact current deployment hostname and, in Production,
the exact stable alias above. The stable alias requires VERCEL_ENV=production,
VERCEL_PROJECT_ID=prj_52ZvN8FCsa7INgMKSDhh16dMLvyP and trusted system
VERCEL_PROJECT_PRODUCTION_URL equal to `thdmn.vercel.app`. VERCEL_URL must have this
project's generated-name form; that pattern validates server configuration only.
Requests must match the resulting exact strings. Other projects/teams, stale
hosts, lookalike suffixes, ports and unknown hosts are rejected. Both the Node and
Fetch boundaries check this rule. Forwarded/X-Forwarded headers never authorize
hosts; absolute-form targets cannot override Host. Any supplied Origin must match
the actual HTTPS request origin, including between the two accepted hosts.
Missing/mismatched Production configuration fails closed. Preview cannot claim
the Production alias. Non-Vercel mode accepts loopback/.invalid test configuration
only; it cannot authorize real Vercel hosts.

Verify automatic system identity/domain values before release and stable alias
assignment after release. If the reported production domain differs, investigate;
do not broaden trust or replace it with request-derived data.

## Existing environment contract (names only)

| Name | Handling |
| --- | --- |
| DATABASE_URL | Keep existing Production server secret targeting Neon development; no export, pull or print |
| NEON_AUTH_BASE_URL | Keep existing Production public Auth base for the same branch |
| DATABASE_URL_UNPOOLED | Keep existing setting; app/build does not read it |
| VERCEL_URL | Automatic current deployment host |
| VERCEL_PROJECT_PRODUCTION_URL | Automatic production domain, exactly thdmn.vercel.app |
| VERCEL_PROJECT_ID / VERCEL_ENV | Automatic project/environment identity |

No new Preview scope, DB branch, secret or Auth origin is proposed. Current
Production is protected verification, with seven fictional tasks in fixed schema
thdmn_v02_trial. It does not establish a real-production DB. Keep existing state,
identities, mappings and grants. New create/edit code does not grant editor or
childAdder rights to the stored user.

## Existing Vercel build and Git settings

- Reuse existing thdmn and GitHub App installation. No new project, PAT,
  VERCEL_TOKEN, Actions deploy secret or proactive grant expansion.
- Repository root; Framework Other; Node 24.x. vercel.json specifies frozen
  install, build, public output, API rewrite, headers and 30-second function.
- Pin hosted pnpm 11.25.0 through approved Corepack setup, for example nonsecret
  ENABLE_EXPERIMENTAL_COREPACK=1 project configuration. Verify the hosted log
  version; packageManager alone may not select it with install overrides.
- Keep main as Production branch and Vercel Authentication for All Deployments.
  Keep custom-domain publication off; no bypass key or protection weakening.
- Keep existing Neon integration and last-known disabled auto-branch/delete
  settings. No Preview setup, reinstall or resync is part of this migration.
- Review source on main before connecting Git: connection may start a first
  build. Do not unintentionally deploy the old legacy main source.
- Region is not overridden; review existing project/Neon region separately.

## Validation and release limits

Tests use synthetic signing keys/fetch, fake PG and temporary files/loopback only.
They cover create/edit/CLI, current authority, conflicts/replay, sessions, privacy,
SQL workspace scoping and stable/foreign host/Origin/header spoofing. Build tests
run twice with outbound JS network APIs blocked, compare artifact/source hashes,
reject secret sentinels and exercise the compiled API host boundary/default deny.

Vercel/Linux tracing, real Google login and live PG create/edit remain unverified.
After main/Git/deployment approval, first verify protected Production readback and
stable-URL Google login/read-only snapshot. Deployment approval grants no DB,
migration, seed, task-write or permission-change authority.

Operational records, identity bindings, seed/probe/deployment scripts, SQL drafts,
images, logs, generated bundles and secrets are excluded by exact source allowlist.
Review any future allowlist additions deliberately.

## Narrow project-rename host compatibility

The existing project remains prj_52ZvN8FCsa7INgMKSDhh16dMLvyP on the existing team. Code accepts its trusted VERCEL_URL with either thdmn- or thddun- prefix and the same exact team suffix. Production configuration must report exactly thdmn.vercel.app or thddun.vercel.app. Allowed production request hosts are the injected current deployment plus only thdmn.vercel.app, thddun.vercel.app, thdmn-aklius14pg-8355s-projects.vercel.app and thddun-aklius14pg-8355s-projects.vercel.app. Preview trusts its own injected deployment URL only. Foreign/stale deployment URLs, other projects/teams, spoofed forwarding headers and cross-origin requests remain denied.

This compatibility patch does not attach domains, alter Neon/Google trusted origins, create accounts, migrate data or enable unpublished Group/branding changes. Provider origin setup and the actual public-alias transition are separate approved steps. Host acceptance is not user authentication. Existing Google/Bearer routes and password session/CSRF logic are unchanged.
