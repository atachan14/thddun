import{createPostgresStructureApi}from'../structure/db/api.mjs';
import{ApiError}from'../domain-draft.mjs';
export function stageApi({repository,authenticate,allowedOrigins,legacyRepository,legacyStructureRepository}){
 const compatible={read:async(context,workspace,target)=>legacyStructureRepository&&!await repository.enabled(context,workspace)?legacyStructureRepository.read(context,workspace,target):repository.read(context,workspace,target)};
 const structure=createPostgresStructureApi({repository:compatible,authenticate,allowedOrigins,writesEnabled:false});
 return async request=>{const url=new URL(request.url);if(url.pathname.startsWith('/api/v02/structure/'))return structure(request);
 const json=(status,x)=>Response.json(x,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 try{if(!allowedOrigins.has(url.origin)||request.headers.has('origin')&&request.headers.get('origin')!==url.origin)throw new ApiError(403,'Origin not allowed');const context=await authenticate(request);if(!context?.subjectId)throw new ApiError(401,'Authentication required');
 if(request.method==='GET'&&url.pathname==='/api/v02/self')return json(200,await repository.own(context,url.searchParams.get('workspace')));
 if(request.method==='GET'&&url.pathname==='/api/v02/snapshot')return json(200,await (legacyRepository&&!await repository.enabled(context,url.searchParams.get('workspace'))?legacyRepository:repository).snapshot(context,url.searchParams.get('workspace')));
 if(request.method==='POST'&&url.pathname==='/api/v02/commands'){
 if(context.csrfVerified!==true)throw new ApiError(403,'Request verification required');if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new ApiError(415,'JSON required');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Invalid request');let text='',size=0;const decoder=new TextDecoder();for(;;){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();throw new ApiError(413,'Request too large');}text+=decoder.decode(value,{stream:true});}let input;try{input=JSON.parse(text+decoder.decode());}catch{throw new ApiError(400,'Invalid JSON');}return json(200,await (legacyRepository?repository.executeCompatible(context,input,legacyRepository):repository.execute(context,input)));
 }return json(404,{error:'Not found'});
 }catch(e){return json(e instanceof ApiError?e.status:503,{error:e instanceof ApiError?e.message:'Stage service unavailable'});}};
}
