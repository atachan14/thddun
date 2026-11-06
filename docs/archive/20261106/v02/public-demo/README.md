# Public sample demo — local only

This is a new, intentionally public fictional cafe dataset. It never imports the
existing trial fixture, identity data, Task data, SQL repository, auth SDK or API.
The production build publishes independent /demo.html, /demo.css and /demo.js
static artifacts. The authenticated application entry does not import this demo.

```
node v02/public-demo/test.mjs
node v02/public-demo/local-server.mjs
```

Open http://127.0.0.1:8772/ . The preview serves static HTML/CSS/JS only and uses
CSP `connect-src 'none'`. It accepts no Task/API write. Its optional local-only
`/__local_checks__` endpoint returns a numeric API request counter, not sample or
private data. The browser copy is in sessionStorage under one dedicated key;
unavailable storage falls back only to memory. Closing the tab discards its copy.

The original sample opens read-only. Copy mode supports title/details, assignee
state and child creation, recomputes prerequisites/child completion, and resumes
that tab's copy. Reset removes only that copy key; other application storage is
untouched. All text renders with textContent/value, never HTML. A Google link
opens the existing protected app; it does not upload or import the demo copy.
Existing Google authorization remains unchanged, including denial for accounts
without existing access. No email/password provider or credentials are created.

Validation: dedicated model/isolation/storage/dependency-closure tests pass.
Browser: read-only sample, copy completion1/4->4/4, title edit, reload showing the
unchanged original, explicit copy resume, child addition reopening parent hold,
and reset all worked. Local API request counter remained0. The public build checks its separate dependency closure and applies
connect-src none to /demo.html. Vercel Standard Protection keeps Preview and
immutable deployment URLs protected; the stable production domain is public. Do not expose the existing trial
fixture or add an anonymous private Task endpoint to implement sample browsing.
