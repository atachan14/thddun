import{mountTopPage}from'../ui/top-page.mjs';import{credentialTransport}from'./credential-transport.mjs';
document.querySelector('.mock-warning').textContent='メール不要のID・パスワード登録。ここはローカル開発DBです。テスト専用のパスワードを使ってください。';
document.querySelector('.google-note').textContent='Google単独ログインの既存コードは保持しています。このローカル環境ではGoogle接続・連携操作は未設定です。';
await mountTopPage({localNotice:'ローカル実認証 / メール不要 / パスワード復旧なし / 開発DBのみ',createTransport:async({onChange})=>credentialTransport({onChange}),resolveOwnPage:async transport=>{const r=await transport.fetchImpl('/api/v02/self?workspace='+encodeURIComponent(transport.workspaceId));if(!r.ok)throw Error();return(await r.json()).page;}});
