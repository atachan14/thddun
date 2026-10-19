import{StructureError,validateStructure,roots,projectPage}from'./contract.mjs';
const json=(status,value)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Unmounted factory only. Every production authentication/access binding remains required.
export function createStructureApi({authenticate,loadModel,canReadPage,canReadTask,canEditTask,canShareDependency,canRemoveReference,execute}={}){
 return async request=>{try{
  if(![authenticate,loadModel,canReadPage,canReadTask].every(x=>typeof x==='function'))return json(503,{error:'Structure service not configured'});
  const context=await authenticate(request);if(!context?.subjectId)return json(401,{error:'Authentication required'});
  const url=new URL(request.url),prefix='/api/v02/structure/';if(!url.pathname.startsWith(prefix))return json(404,{error:'Not found'});
  const operationType=new Map([['dependencies','addDependency'],['references/remove','removeReference'],['dependencies/remove','removeDependency']]).get(url.pathname.slice(prefix.length));
  if(request.method==='POST'&&operationType){
   if(url.search)return json(400,{error:'Query parameters not accepted'});
   if(![execute,operationType==='removeReference'?canRemoveReference:canEditTask,...(operationType==='addDependency'?[canShareDependency]:[])].every(x=>typeof x==='function'))return json(503,{error:'Dependency writes not configured'});
   if(context.csrfVerified!==true)return json(403,{error:'Request verification required'});
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json(415,{error:'JSON required'});
   const text=await request.text();if(new TextEncoder().encode(text).length>32768)return json(413,{error:'Request too large'});
   let input;try{input=JSON.parse(text);}catch{return json(400,{error:'Invalid JSON'});}
   if(!input||Array.isArray(input)||typeof input!=='object')return json(400,{error:'Invalid operation'});
   if(input.type!==undefined&&input.type!==operationType)return json(400,{error:'Invalid operation'});
   return json(200,await execute(context,{...input,type:operationType},{canReadPage,canReadTask,canEditTask,canShareDependency,canRemoveReference}));
  }
  if(request.method!=='GET')return json(405,{error:'Unsupported method'});
  if(url.search)return json(400,{error:'Query parameters not accepted'});
  const model=validateStructure(await loadModel(context)),access={canReadPage,canReadTask,canEditTask,canShareDependency,canRemoveReference};
  if(url.pathname===prefix+'roots')return json(200,{pages:roots(model,context,access)});
  const match=/^pages\/(account|group|task)\/([^/]+)$/.exec(url.pathname.slice(prefix.length));
  if(!match)return json(404,{error:'Not found'});
  let id;try{id=decodeURIComponent(match[2]);}catch{return json(400,{error:'Invalid page ID'});}
  return json(200,projectPage(model,context,{kind:match[1],id},access));
 }catch(error){const status=error instanceof StructureError?error.status:503;return json(status,{error:status===404?'Not found':status===403?'Dependency not permitted':status===409?'Dependency conflict':status===400?'Invalid dependency':'Structure unavailable'});}};
}
