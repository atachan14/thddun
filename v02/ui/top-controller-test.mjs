import assert from'node:assert/strict';import{topController,credentialError}from'./top-controller.mjs';
let changed,loginCalls=0,finish,own={kind:'account',id:'local-account-a'},outcome='success',routes=[];
const client={login:async()=>{loginCalls++;if(outcome==='failure')throw Error();if(outcome==='pending')await new Promise(r=>finish=r);return{};},session:{refresh:async()=>changed({phase:'authenticated'}),signOut:async()=>changed({phase:'anonymous'})}};
const c=topController({auth:()=>client,resolveOwnPage:async()=>own,navigate:r=>routes.push(r)});changed=c.sessionChanged;
await c.sessionChanged({phase:'anonymous'});assert.equal(c.route('#account'),false);
const first=c.login();await c.login();await first;assert.equal(loginCalls,1);assert.equal(c.state.page.id,'local-account-a');assert.equal(c.route('#account'),true);
await c.logout();assert.equal(c.state.page,null);assert.equal(c.route('#account'),false);
outcome='failure';await c.login();assert.equal(c.state.phase,'anonymous');assert(c.state.message);
outcome='pending';const pending=c.login();c.cancel();finish();await pending;assert.equal(c.state.phase,'anonymous');assert.equal(c.state.page,null);
outcome='success';own=null;await c.login();assert.equal(c.state.phase,'missing');assert.equal(c.state.page,null);assert.equal(routes.at(-1),'top');
own={kind:'group',id:'do-not-substitute'};await c.login();assert.equal(c.state.phase,'error');assert.equal(c.state.page,null);
let resolve;own=null;const old=topController({auth:()=>client,resolveOwnPage:()=>new Promise(r=>resolve=r)});const request=old.sessionChanged({phase:'authenticated'});await old.sessionChanged({phase:'anonymous'});resolve({kind:'account',id:'stale'});await request;assert.equal(old.state.page,null);
let finishLogout;client.session.signOut=async()=>{await changed({phase:'anonymous'});await new Promise(r=>finishLogout=r);};const out=c.logout();const callsBefore=loginCalls;await c.login();assert.equal(loginCalls,callsBefore);assert.equal(c.state.phase,'signing-out');finishLogout();await out;assert.equal(c.state.phase,'anonymous');
console.log('PASS TopPage own AccountPage only, no Group fallback, missing/failure/cancel/repeated login, logout serialization/back guard and stale identity response cleared. Synthetic only.');

assert(credentialError({id:'UP',password:'12345678',mode:'login'}));assert(credentialError({id:'tester',password:'short',mode:'login'}));assert(credentialError({id:'tester',password:'12345678',confirmation:'other',mode:'signup'}));assert.equal(credentialError({id:'tester',password:'12345678',confirmation:'12345678',mode:'signup'}),'');
let payload;const methods=topController({auth:()=>({login:async options=>{payload=options;return{};},session:{refresh:async()=>{}}}),resolveOwnPage:async()=>null});await methods.login({mode:'signup',method:'google'});assert.equal(payload.method,'google');assert.equal(payload.mode,'signup');assert.equal(payload.password,undefined);assert.equal(payload.id,undefined);methods.cancel();assert(payload.signal.aborted);await methods.login({mode:'login',method:'credentials',id:'tester',password:'12345678'});assert.equal(payload.method,'credentials');console.log('PASS prototype validation and separate Google-only/ID-password payloads, abort on dismissal; no credential registration or verification.');
