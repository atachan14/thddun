import{mountTopPage}from'./top-page.mjs';
import{authenticatedTransport}from'./authenticated-transport.mjs';
// Own-page mapping is explicit server data. Never infer it from email or first membership.
document.querySelector('.mock-warning').textContent='実データ用Google認証。登録済みユーザーのみ利用できます。ID・パスワード認証は未接続です。';
document.getElementById('top-no-recovery').textContent='メール不要のID・パスワード登録は未対応です。認証方式は継続検討中です。';
await mountTopPage({createTransport:async({onChange})=>{
 const response=await fetch('/api/v02/environment',{cache:'no-store'});
 if(!response.ok)throw Error();const config=await response.json();
 if(config.storage!=='postgres'||!config.authBaseUrl)throw Error();
 const existing=await authenticatedTransport({authBaseUrl:config.authBaseUrl,onChange});
 return {...existing,workspaceId:config.workspaceId,stageOne:config.stageOne,login:options=>{if(options.method!=='google')throw Object.assign(Error('Not connected'),{code:'AUTH_METHOD_UNAVAILABLE'});return existing.login();}};
},resolveOwnPage:async transport=>{const r=await transport.fetchImpl('/api/v02/self?workspace='+encodeURIComponent(transport.workspaceId));if(!r.ok)throw Error('Own page unavailable');return (await r.json()).page;}});
