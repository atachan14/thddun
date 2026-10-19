import{StructureMemoryStore}from'./memory-store.mjs';
// Synthetic loopback preview only. Never imported by the production entry/build.
import http from'node:http';import fs from'node:fs/promises';
import{createStructureApi}from'./api.mjs';import{structureSample}from'./sample.mjs';
const port=Number(process.argv[2]||8768);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
const store=new StructureMemoryStore(structureSample());
const api=createStructureApi({authenticate:async()=>({subjectId:'synthetic-preview',csrfVerified:true}),loadModel:async()=>store.snapshot(),canReadPage:()=>true,canReadTask:()=>true,canEditTask:(_,id)=>['personal','build'].includes(id),canShareDependency:()=>true,execute:(...args)=>store.execute(...args)});
const files=new Map([['/','preview.html'],['/preview.html','preview.html'],['/browser.mjs','browser.mjs']]);
http.createServer(async(req,res)=>{try{
 if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403).end();return;}
 if(req.url.startsWith('/api/v02/structure/')){if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:'+port){res.writeHead(403).end();return;}const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>32768){res.writeHead(413).end();return;}chunks.push(c);}const response=await api(new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers)).end(await response.text());return;}
 if(req.method!=='GET'||!files.has(req.url)){res.writeHead(404).end();return;}
 const file=files.get(req.url);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8','Cache-Control':'no-store'}).end(await fs.readFile(new URL(file,import.meta.url)));
 }catch{res.writeHead(503).end('Synthetic preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic memory-only structure preview http://127.0.0.1:'+port+'; no real DB/auth.'));
