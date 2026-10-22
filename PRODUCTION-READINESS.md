# Production password API rollout

The cookie-based ID/password application uses /top.html and the isolated /api/app/v1 namespace. Its fixed workspace is demo in thdmn_v02_trial. Existing Google/Bearer routes and the original root UI remain on the legacy application. No legacy Tasks, Group pages, Tier/Policy values or provider identities are converted automatically. The Google alternative in the new UI opens the existing root login experience; it does not claim to link an existing Google identity to a new password Account.

## Security and runtime

The production adapter uses the existing serverless Postgres driver and scoped transactions. Password/session/CSRF handling is shared with the tested credential core. Secure HttpOnly host cookies are emitted as separate Set-Cookie headers; exact HTTPS origins, CSRF, request limits, process-wide hash concurrency and database-backed authentication limits apply. Only Vercel's platform x-vercel-forwarded-for header is used for production address limiting; missing or malformed values use a shared unknown bucket. New routes reject Bearer credentials and foreign workspace queries. Legacy routes never fall through to the new policy engine. Schema readiness fails closed. No runtime migration, seed, PGlite dependency or fixture enters the deployment.

## Data preservation and migrations

The additive migration chain after 001/002 is 003, 004-010, 012, 014-018. Version 007 is checked by its tables/sequences because its original SQL has no version row. Legacy data table fingerprints must remain identical; the migration history gains records. Existing Task IDs are reserved in stable internal-ID order, and new numeric IDs continue the sequence. Unknown historical creation times are explicitly application-time backfill, not historical evidence.

Backup before any application, verify all-or-nothing rehearsal/rollback and compare all original data tables. Keep the provider-managed snapshot private. Code rollback disables the new namespace without dropping its data. Do not restore an old database snapshot over later writes automatically. Full restore or purge requires a separately reviewed recovery operation.

## Verification and limits

The isolated production HTTP regression covers Secure cookies/CSRF, registration/login/logout, add-only child creator management and initial assignment/Policy, outsider denial, assignment access/revocation, required descendant fields, completion timestamps, negative placement persistence, visibility-bounded ancestry and reversible trash/restore. The same bounded helper can run against an explicitly approved deployment with disposable qa_ Accounts. It generates secrets only in memory, never logs or returns them, and signs out its sessions. It leaves clearly marked synthetic records for inspection, with the deleted test Task restored.

HTTP/SQL smoke tests are not browser interaction tests or a security audit. Actual modal/focus/drag/clipboard/responsive navigation still require browser verification. Existing Google OAuth grants are not exercised by automation and provider configuration is unchanged. Recovery, Group features, arbitrary references and migration of old projects remain deferred.
