import{parseReference}from'../identifier-notation.mjs';
import{isLoginId}from'../local-auth/login-id.mjs';
// UI routing only. Identity and permissions always belong to the existing server.
export function topController({auth,resolveOwnPage,onState=()=>{},navigate=()=>{}}){
 let generation=0,busy=false,signingOut=false,loginAbort=null,current={phase:'checking',page:null,message:''};
 const emit=(phase,message='',page=null)=>{current={phase,message,page};onState({...current,busy});};
 async function sessionChanged({phase}){const turn=++generation;if(signingOut){busy=true;navigate('top');emit('signing-out');return;}busy=false;
  if(phase!=='authenticated'){navigate('top');emit(phase,phase==='error'?'ログイン状態を確認できません。もう一度お試しください。':'');return;}
  busy=true;emit('checking');try{const page=await resolveOwnPage();if(turn!==generation)return;
   busy=false;if(!page){navigate('top');emit('missing','ログインしました。あなたのAccountPageはまだ準備されていません。');return;}
   if(page.kind!=='account'||typeof page.id!=='string'||!page.id)throw Error('Invalid own AccountPage');
   emit('authenticated','',page);navigate('account');
  }catch{if(turn===generation){busy=false;navigate('top');emit('error','AccountPageを確認できません。');}}
 }
 async function login(options={}){if(busy)return;loginAbort=new AbortController();const turn=++generation;busy=true;emit('signing-in');try{const result=await auth().login({...options,signal:loginAbort.signal});if(turn!==generation)return;if(result?.error)throw Error();await auth().session.refresh();}catch(error){if(turn===generation){busy=false;emit('anonymous',error.code==='GOOGLE_UNAVAILABLE_LOCAL'?'このローカル環境ではGoogle認証は未設定です。':error.code==='AUTH_RATE_LIMIT'?'試行回数が上限に達しました。15分後にお試しください。':error.code==='AUTH_ID_UNAVAILABLE'?'このIDは使用できません。別のIDを選んでください。':error.code==='AUTH_CREDENTIALS_INVALID'?'IDまたはパスワードが正しくありません。':error.code==='AUTH_METHOD_UNAVAILABLE'?'ID・パスワード認証は未接続です。':'認証を完了できませんでした。もう一度お試しください。');}}}
 function cancel(){loginAbort?.abort();generation++;busy=false;navigate('top');emit('anonymous','ログインを中断しました。');}
 async function logout(){if(signingOut)return;loginAbort?.abort();generation++;signingOut=true;busy=true;navigate('top');emit('signing-out');let failed=false;try{await auth().session.signOut();}catch{failed=true;}finally{generation++;signingOut=false;busy=false;emit(failed?'error':'anonymous',failed?'ログアウトを確認できません。もう一度ログアウトしてください。':'');}}
 function route(hash){if((hash==='#account'||/^#assigned=.+$/.test(hash)||/^#(?:@?[A-Za-z][A-Za-z0-9_-]{3,19}|[0-9]{4,19})$/.test(hash)||/^#page=(account|group|task):.+$/.test(hash))&&current.phase==='authenticated'&&current.page)return true;navigate('top');return false;}
 return{sessionChanged,login,cancel,logout,route,get state(){return{...current,busy};}};
}

// Prototype form validation only; this does not create or verify credentials.
export function credentialError({id,password,confirmation,mode}){if(!isLoginId(parseReference(id,'account')))return 'AccountIDは英字で開始する英数字・_・- の4〜20文字です。';if(typeof password!=='string'||password.length<8||password.length>128)return 'パスワードは8〜128文字で入力してください。';if(mode==='signup'&&password!==confirmation)return '確認用パスワードが一致しません。';return '';}
