import{StructureError,validateStructure,roots,projectPage}from'./contract.mjs';
const json=(status,value)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Unmounted factory only. Every production authentication/access binding remains required.
export function createStructureApi({authenticate,loadModel,canReadPage,canReadTask}={}){
 return async request=>{try{
  if(![authenticate,loadModel,canReadPage,canReadTask].every(x=>typeof x==='function'))return json(503,{error:'Structure service not configured'});
  const context=await authenticate(request);if(!context?.subjectId)return json(401,{error:'Authentication required'});
  const url=new URL(request.url),prefix='/api/v02/structure/';if(!url.pathname.startsWith(prefix))return json(404,{error:'Not found'});
  if(request.method!=='GET')return json(405,{error:'Read-only structure prototype'});
  if(url.search)return json(400,{error:'Query parameters not accepted'});
  const model=validateStructure(await loadModel(context)),access={canReadPage,canReadTask};
  if(url.pathname===prefix+'roots')return json(200,{pages:roots(model,context,access)});
  const match=/^pages\/(account|group|task)\/([^/]+)$/.exec(url.pathname.slice(prefix.length));
  if(!match)return json(404,{error:'Not found'});
  let id;try{id=decodeURIComponent(match[2]);}catch{return json(400,{error:'Invalid page ID'});}
  return json(200,projectPage(model,context,{kind:match[1],id},access));
 }catch(error){return json(error instanceof StructureError&&error.status===404?404:503,{error:error instanceof StructureError&&error.status===404?'Not found':'Structure unavailable'});}};
}
