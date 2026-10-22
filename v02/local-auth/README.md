# Local Account / Task development

This is the local email-free Account application used by the loopback development server. It is **not wired into the existing Vercel production entry**. Do not treat the loopback launcher or local migration helpers as production deployment tooling.

## Settled behavior

- Immutable lowercase AccountID/login ID (ASCII letter first, 4–20 letters/digits/_/-); numeric sequential Task IDs, padded through 9999. Internal relation keys remain stable. Symbols are presentation only: @Account, #Task, !担当@Account for the derived assignment page.
- Password hashing uses scrypt. Random session and CSRF tokens are stored as hashes; sessions are revocable. HTTPS uses Secure/HttpOnly/SameSite cookies. Exact-origin/CSRF validation and DB-backed per-account/address rate limits are implemented. The loopback server alone allows local HTTP.
- Every Account implicitly manages itself. Manage implies add implies view, with downward inheritance. Assignment adds implicit add/view on the Task subtree; removing assignment removes only that access source, retaining any separate grants. Child Account external grants never flow upward; references never grant target rights.
- A user with only add on a parent receives default explicit manage on each newly created Task, enabling initial assignment/Policy/field settings. This never modifies parent/sibling/existing-Task grants; an explicitly supplied initial Policy can change the default just like a later Task Policy edit.
- Task completion requires at least one assignee and every assignee done. Dependency/readiness remains separate. Account completion combines assigned/direct Tasks and direct Accounts, with empty Accounts complete. Own-status-only autosave remains separate from manager-only assignment changes.
- Own Account → Task/child Task and child Account create/edit, fixed ID validation, Policy editing, server-authorized move and recoverable subtree trash/restore. Account deletion revokes logins/sessions; no irreversible purge, recovery operator or identity relinking is provided.
- Stable field definitions, per-page values/selections and descendant enforcement are separate. Required empty existing pages are readable but create/edit saves block until valid. Inherited requirements cannot be weakened. Moves retain explicit values and recalculate implicit requirements. Official creation date/datetime, last completion and Account-only last login are optional readonly displays; underlying timestamps remain recorded.
- Parent-owned normal Card coordinates and separate per-Account assignment reference coordinates persist. Assigned layout changes require containing Account manage plus visible/currently assigned source Task, without reparenting or granting Task management.
- Group features, arbitrary reference creation tools and optional recovery/linking setup remain deferred. Existing Google-only production auth is separate; this local entry does not implement Google login/linking.

## Local verification

Use the repository's pinned Node/pnpm versions and installed dependencies. Run 'pnpm test' and 'pnpm run test:build'. The full test runner discovers v02 tests automatically. SQL tests require the separate, explicit developer-only PGlite setup described in '../structure/db/README.md'; they never use DATABASE_URL or fall back to a remote DB. Runtime DBs, installed test engine, backups and audit logs are ignored.

The normal development launcher is 'node v02/ui/top-local-server.mjs', serving the existing loopback preview on port 8773. Do not open its disk-backed PGlite data directory concurrently from another process.

## Migration review

The prepared local sequence is baseline 003, then 004–010, 012, 014–018. Missing version numbers are intentional superseded proposals. Do not blindly apply this local sequence to a hosted database or existing provider identities.

- 012 records audit timestamps; unknown historical times initially remain unknown.
- 014 validates/fixes Account identifier format/uniqueness/immutability without silently renaming credentials.
- 015 adds stable field definitions/selections/values/descendant rules, preserving original JSON.
- 016 adds optional creation datetime and fills only missing creation times with one recorded application timestamp; those filled times are not historical creation evidence.
- 017 adds optional readonly Account last-login display without changing its record.
- 018 adds an empty assignment-layout table, independent of canonical hierarchy and normal placement.

The apply-approved helpers are local-only manual tools with explicit guards, backup and preservation checks. No migration runs during production build. Hosted activation requires a separately reviewed data/identity preflight, backup/rollback plan and approval; never reset or seed existing data.

See the root PRODUCTION-READINESS.md for current release blockers and unverified browser/security flows.
