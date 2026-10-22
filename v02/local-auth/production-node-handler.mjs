import{Pool,neonConfig}from'@neondatabase/serverless';
import{isIP}from'node:net';
import{trialNodeHandler}from'../trial/node-handler.mjs';
import{deploymentHosts}from'../trial/deployment-hosts.mjs';
import{createPasswordApplication,PASSWORD_API_PREFIX}from'./production-application.mjs';
neonConfig.webSocketConstructor=globalThis.WebSocket;
export function productionAddress(req,env){const value=env.VERCEL==='1'?req.headers['x-vercel-forwarded-for']:req.socket?.remoteAddress;return typeof value==='string'&&isIP(value)?value:'unknown';}
export function productionNodeHandler(env=process.env,{openPool=connectionString=>{const pool=new Pool({connectionString,max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});pool.on('error',()=>{});return pool;},legacy=trialNodeHandler(env)}={}){const hosts=deploymentHosts(env),app=createPasswordApplication({env,openPool});return async(req,res)=>{const host=req.headers.host;if(typeof host!=='string'||!hosts?.has(host)){res.writeHead(403,{'Cache-Control':'no-store'}).end('Origin not allowed');return;}let url;try{url=new URL(req.url,'https://'+host);if(url.origin!=='https://'+host||url.username||url.password)throw Error();}catch{res.writeHead(403).end();return;}
 if(!url.pathname.startsWith(PASSWORD_API_PREFIX+'/'))return legacy(req,res);
 try{const method=req.method||'GET',headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);const init={method,headers};if(!['GET','HEAD'].includes(method)){let body;if(req.body!==undefined)body=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413).end('Request too large');return;}chunks.push(chunk);}body=Buffer.concat(chunks);}if(body.length>32768){res.writeHead(413).end('Request too large');return;}init.body=body;}
 const response=await app(new Request(url,init),{address:productionAddress(req,env)}),out=Object.fromEntries(response.headers);delete out['set-cookie'];const cookies=response.headers.getSetCookie();if(cookies.length)out['set-cookie']=cookies;res.writeHead(response.status,out);res.end(await response.text());
 }catch{res.writeHead(503,{'Cache-Control':'no-store'}).end('Application unavailable');}};}
export default productionNodeHandler();
