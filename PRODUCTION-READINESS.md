# Production test readiness

The local basic feature set is broad enough for a controlled staging test, but **the current local application is not ready for a direct production deployment**.

## Verified implementation and limits

Local SQL and synthetic UI tests cover registration/session revocation/CSRF/rate limits, own Account and nested creation/edit, manage/add/view boundaries, assignment implicit access and revocation without removing independent grants, moves/explicit grants, soft-delete/restore, required inherited fields and move recomputation, timestamps, normal/reference placement, Current versus detail selection, breadcrumb restoration and visibility barriers. These are fixture tests, not a security audit or genuine real-auth browser end-to-end verification.

No actual authenticated desktop/mobile browser flow has been verified by the current executor. Pointer/focus/clipboard/modal interaction and accessibility/visual behavior still need real-browser coverage.

The add-only creator default is an explicit manage grant on the newly created Task only. It does not modify parent/sibling/existing grants and can be deliberately changed in the new Task Policy. Because it is explicit, removing an assignment or parent add grant does not remove that separate creator grant; test each access source independently. No existing Task was retroactively elevated.

## Deployment blockers

1. Production build bundles top-entry.mjs (existing Google/Neon auth), while the local credential experience uses local-auth/entry.mjs. The Vercel API uses the previous Postgres/StageRepository route, not the local PolicyRepository/credential service. Wire an explicitly reviewed production auth/API entry before expecting local features to work there; do not relink existing provider identities implicitly.
2. The local PGlite launcher, fixture workspace and migration helpers are development tooling. Choose/verify the intended hosted persistence adapter, schema/workspace/identity mappings, exact HTTPS origins, trusted proxy/client-address handling and shared rate-limit/session behavior. Confirm secret **names/scopes** without exporting or printing values. Existing environment presence/configuration has not been revalidated for the new entry.
3. Dry-run the entire prerequisite schema chain and migrations 015–018 against a representative isolated hosted snapshot. Check identifier compatibility before 014; preserve original field JSON and grants; distinguish 016 application-time backfill from genuine history; preserve sessions/logins through 017 and parentage/normal placements through 018. Review backup restoration and rollback before any live migration. No production migration is authorized by committing source.
4. Git push and deployment are separate. Review the destination branch and hosting Git integration: main has produced Production deployments previously. A source push must not silently activate deployment. No deployment settings, secrets, credentials or data are changed by this checkpoint.

## Required pre-deploy checks

- Run clean-checkout tests/build with the documented isolated test engine. Confirm all runtime imports are committed and no local DB, backup, token, user data or generated output is included.
- In a protected, explicitly approved staging environment, run real-browser signup/login/logout/refresh/expired-session and CSRF/cross-origin/authorization denial checks. Verify password changes revoke the intended sessions and no password/hash leaks into responses/logs/storage. Optional Google linking/recovery requires its own design/approval; no recovery is currently provided.
- Test two independent Accounts plus a manager/viewer: assignment grants implicit subtree access, removal revokes that source, explicit/inherited grants remain, outsiders cannot read/count/modify private targets, and hidden exact-ID assignment does not reveal profile names.
- Test ancestor forced/required fields on existing pages and after moves; editor save blocks but navigation/own-status autosave remains usable. Verify optional builtin timestamps persist while hidden.
- Test nested Task/Account soft-delete, login/session revocation, parent-authorized restore and original hierarchy/permissions. Verify external reference targets remain untouched. No irreversible purge/operator recovery is implemented.
- Verify normal and assigned Card drag/reload, reference identity, navigation/detail separation, sidebar states, modal drafts/focus/keyboard, back/forward/reload, mobile widths and permission-bounded ancestry.

Only after these checks and explicit deployment/migration approval should the existing production environment be used for testing. Prefer a protected staging route/DB with disposable data first; do not use real user credentials for automated fixture testing.
