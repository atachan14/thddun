import{mountTopPage}from'./top-page.mjs';
import{credentialTransport}from'../local-auth/credential-transport.mjs';
// New cookie API is isolated from the existing Google/Bearer routes.
export const passwordFetch=(path,options)=>fetch(path.replace(/^\/api\/v02(?=\/)/,'/api/app/v1'),options);
document.querySelector('.mock-warning').textContent='メール不要のAccountID・パスワード登録です。復旧手段は現在提供していません。';
document.querySelector('.google-note').textContent='既存のGoogleログインは従来画面で利用できます。Accountの自動連携・移動は行いません。';
await mountTopPage({createTransport:async({onChange})=>credentialTransport({onChange,workspaceId:'demo',fetchImpl:passwordFetch}),resolveOwnPage:async transport=>{const r=await transport.fetchImpl('/api/v02/self?workspace=demo');if(!r.ok)throw Error();return(await r.json()).page;}});
document.getElementById('top-auth-google').onclick=()=>location.assign('/');
