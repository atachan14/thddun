import{timed}from'../ui/timing.mjs';
// Session/token state is memory-only. Fail closed on errors and stale async replies.
const failure=code=>Object.assign(Error(code),{code});
export function sessionController({client,onChange=()=>{}}){
 let version=0,state={phase:'checking',user:null};
 const publish=(phase,user=null)=>{state={phase,user};onChange({...state});};
 async function refresh(){const turn=++version;publish('checking');try{const{data,error}=await timed('session',()=>client.getSession());if(error)throw error;if(turn!==version)return;publish(data?.user?'authenticated':'anonymous',data?.user||null);}catch{if(turn===version)publish('error');}}
 async function signOut(){++version;publish('anonymous');const{error}=await client.signOut();if(error)throw Error('Sign-out failed');}
 async function protectedFetch(url,fetcher=fetch,options={}){if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//'))throw Error('Same-origin path required');if(state.phase!=='authenticated')throw failure('SESSION_REQUIRED');const turn=version;const{data,error}=await timed('token',()=>client.token({fetchOptions:{headers:{'X-Force-Fetch':'true'},signal:options.signal}}));if(error||!data?.token){if(turn===version){++version;publish('error');}throw failure(options.signal?.aborted?'REQUEST_TIMEOUT':'TOKEN_UNAVAILABLE');}if(turn!==version||state.phase!=='authenticated')throw failure('SESSION_CHANGED');const response=await fetcher(url,{...options,headers:{...options.headers,Authorization:'Bearer '+data.token}});if(turn!==version||state.phase!=='authenticated')throw failure('SESSION_CHANGED');if(response.redirected||response.headers?.get('content-type')?.includes('text/html'))throw failure('DEPLOYMENT_AUTH_REDIRECT');if(turn===version&&response.status===401){++version;publish('anonymous');}return response;}
 return{refresh,signOut,protectedFetch,get state(){return{...state};}};
}
