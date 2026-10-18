// Separate entry prevents the legacy local actor/ledger client from starting in API mode.
if(new URL(location.href).searchParams.get('api')==='v02')await import('./v02/ui/shell-entry.mjs');else await import('./app.mjs');
