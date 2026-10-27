import{credentialService}from'./credential-service.mjs';
import{PolicyRepository}from'./policy-repository.mjs';
import{stageApi}from'../stage-one/api.mjs';
import{scopedPool}from'../trial/scoped-pool.mjs';
import{deploymentHosts}from'../trial/deployment-hosts.mjs';
import{loadDemoRegistry}from'./demo-registry.mjs';
export const PASSWORD_API_PREFIX='/api/app/v1';
export const PASSWORD_WORKSPACE='demo';
const json=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Separate namespace: legacy Bearer/Google APIs never use the new policy engine.
export function createPasswordApplication({env,openPool}){const hosts=deploymentHosts(env);return async(request,{address='unknown'}={})=>{let raw;try{
 const url=new URL(request.url);if(!hosts||url.protocol!=='https:'||!hosts.has(url.host)||url.username||url.password||!url.pathname.startsWith(PASSWORD_API_PREFIX+'/'))return json(403,'Origin not allowed');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return json(403,'Origin not allowed');
 if(request.headers.has('authorization'))return json(401,'Cookie authentication required');
 const routedPath=url.searchParams.get('path');if(url.searchParams.getAll('path').length>1||routedPath!==null&&routedPath!==url.pathname.slice('/api/'.length))return json(400,'Invalid route');
 if(url.searchParams.has('workspace')&&url.searchParams.get('workspace')!==PASSWORD_WORKSPACE)return json(403,'Workspace not allowed');
 if(!env.DATABASE_URL)return json(503,'Database configuration unavailable');raw=openPool(env.DATABASE_URL);const pool=scopedPool(raw);
 const client=await pool.connect();try{const r=await client.query("SELECT to_regclass('thdmn_v02_trial.local_auth_credentials') IS NOT NULL AND to_regclass('thdmn_v02_trial.local_assigned_card_positions') IS NOT NULL AND EXISTS(SELECT 1 FROM thdmn_v02_trial.structure_migrations WHERE version='018-assigned-card-positions') AS ready");if(!r.rows[0]?.ready)return json(503,'Application schema unavailable');}finally{client.release();}
 const internal=new URL(url);internal.pathname='/api/v02'+url.pathname.slice(PASSWORD_API_PREFIX.length);if(routedPath!==null)internal.searchParams.set('path',internal.pathname.slice('/api/'.length));const init={method:request.method,headers:request.headers};if(!['GET','HEAD'].includes(request.method))init.body=await request.arrayBuffer();const routed=new Request(internal,init);
 const demoRegistry=await loadDemoRegistry(pool,PASSWORD_WORKSPACE),demoValues=url.searchParams.getAll('demo');
 if(demoValues.length>1||demoValues.length&&!['manager','staff','guest'].includes(demoValues[0]))return json(400,'Invalid demo entry');
 const demoSession=demoValues.length===1;
 if(demoSession&&demoRegistry.length!==3)return json(503,'Shared demo unavailable');
 const auth=credentialService({pool,origin:url.origin,workspaceId:PASSWORD_WORKSPACE,demoRegistry,demoSession,allowPublicDemo:true});
 if(internal.pathname.startsWith('/api/v02/auth/'))return await auth.handle(routed,{address});
 return await stageApi({repository:new PolicyRepository(pool,{demoRegistry}),allowedOrigins:new Set([url.origin]),authenticate:auth.context})(routed);
 }catch{return json(503,'Application unavailable');}finally{if(raw)try{await raw.end();}catch{}}};}
