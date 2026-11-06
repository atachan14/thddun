# Legacy stage-one typed page adapter

This is the retained baseline adapter, schema 003 and its synthetic compatibility tests. The current local Account/Task application uses the newer local-auth/PolicyRepository core; see ../local-auth/README.md. Earlier Google-first activation proposals and fixture-password bypasses are superseded and must not be activated.

The baseline resolves an explicitly mapped own AccountPage and supports typed Account/Task parents without representing an Account as a Task. It preserves earlier Tier/Policy rows and legacy read compatibility. The existing hosted API can select this adapter with THDMN_STAGE_ONE; that does not activate the current local credentials/Policy/field implementation.

provision-own-page.sql is a preparation template for an explicit owner mapping. It never infers identity from email, first membership or assignment. Do not execute it against hosted data or relink existing identities without a reviewed plan and approval.

Local SQL tests use the explicit PGlite test engine documented in ../structure/db/README.md, fictional data and no remote DB fallback. Production wiring/migrations are separate; see the root PRODUCTION-READINESS.md.
