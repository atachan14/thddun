import{demoEntries,demoFetch,demoEntryHref}from'../local-auth/demo-client.mjs';
import{mountTopPage}from'./top-page.mjs';
import{credentialTransport}from'../local-auth/credential-transport.mjs';
// New cookie API is isolated from the existing Google/Bearer routes.
const demoRole=new URL(location.href).searchParams.get('demo');
const sharedFetch=demoFetch({role:demoRole});
export const passwordFetch=(path,options)=>sharedFetch(path.replace(/^\/api\/v02(?=\/)/,'/api/app/v1'),options);
document.querySelector('.mock-warning').textContent='メール不要のAccountID・パスワード登録です。復旧手段は現在提供していません。';
document.querySelector('.google-note').textContent='既存のGoogleログインは従来画面で利用できます。Accountの自動連携・移動は行いません。';
const home=document.querySelector('#top-home');
for(const[role,label]of demoEntries){const a=document.createElement('a');a.className='sample-entry';a.href=demoEntryHref(role);a.textContent=label+'で体験';home.append(a);}
if(demoRole){const note=document.createElement('p');note.textContent='誰でも利用できる共有Accountです。個人情報は入力しないでください。変更は全訪問者に反映されます。';home.prepend(note);const exit=document.createElement('a');exit.href='/top.html';exit.textContent='通常のAccountへ戻る';document.querySelector('.header-account').prepend(exit);}
await mountTopPage({localNotice:demoRole?'公開共有サンプル / 個人情報禁止 / 変更は全訪問者へ反映':null,googleLabel:'従来のGoogleログインを開く',createTransport:async({onChange})=>credentialTransport({onChange,workspaceId:'demo',fetchImpl:passwordFetch,demoRole}),resolveOwnPage:async transport=>{const r=await transport.fetchImpl('/api/v02/self?workspace=demo');if(!r.ok)throw Error();return(await r.json()).page;}});
document.getElementById('top-auth-google').onclick=()=>location.assign('/');
