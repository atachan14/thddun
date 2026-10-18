import{previewBulk}from'./domain.mjs';
import http from'node:http';import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{LedgerStore}from'./ledger-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=new Set(['index.html','app-entry.mjs','app.mjs','model.mjs','favorites.mjs','comparison.mjs','domain.mjs','tier.mjs','independent.mjs','relations.mjs','work-states.mjs','task-appearance.mjs','compact-form.mjs','suggestions.mjs','add-disclosure.mjs','relation-picker.mjs','child-settings.mjs','user-items.mjs','file-client.mjs','graph.mjs','layered-layout.mjs','routing.mjs','camera.mjs','menu-pane.mjs','style.css','simple.css','site-layout.css','menu-pane.css']);
export function createServer({dir=process.env.THDMN_DATA_DIR||path.join(root,'runtime','data')}={}){
 const store=new LedgerStore(dir),clients=new Set();
 const server=http.createServer(async(req,res)=>{
  const origin=`http://127.0.0.1:${server.address().port}`,json=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try{
   if(req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin){json(403,{error:'別Originからは利用できません'});return;}
   const url=new URL(req.url,origin);
   if(req.method==='GET'&&url.pathname==='/api/ledger'){const e=store.read();json(e?200:404,e?{revision:e.revision,data:e.data}:{initialized:false});return;}
   if(req.method==='GET'&&url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('event: ready\ndata: {}\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
   if(req.method==='POST'&&['/api/commands','/api/migration/preview','/api/migration','/api/tiers/preview','/api/bulk/preview'].includes(url.pathname)){
    if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'||req.headers['x-thdmn-client']!=='local'){json(403,{error:'同一Originのローカル操作が必要です'});return;}
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>10*1024*1024){json(413,{error:'入力が大きすぎます'});return;}}let input;try{input=JSON.parse(text);}catch{json(400,{error:'JSONが不正です'});return;}
    if(url.pathname==='/api/bulk/preview'){const e=store.read();if(!e||e.revision!==input.expectedRevision){json(409,{error:'別の更新があります'});return;}json(200,{revision:e.revision,...previewBulk(e.data,input.command,input.actorId)});return;}
    if(url.pathname==='/api/tiers/preview'){const{data,...preview}=store.previewTiers(input.actorId,input);json(200,preview);return;}
    if(url.pathname==='/api/migration/preview'){const{data,...preview}=store.preview(input.data,input.actorId);json(200,preview);return;}
    const result=store.execute(url.pathname==='/api/migration'?{actorId:input.actorId,operationId:input.operationId,expectedRevision:null,migration:input.data,sourceKey:input.sourceKey}:{actorId:input.actorId,operationId:input.operationId,expectedRevision:input.expectedRevision,command:input.command});
    json(200,{revision:result.revision,data:result.data,replayed:!!result.replayed});for(const c of clients)c.write(`event: changed\ndata: ${JSON.stringify({revision:result.revision})}\n\n`);return;
   }
   const name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(req.method!=='GET'||!files.has(name)){json(404,{error:'not found'});return;}res.writeHead(200,{'Content-Type':name.endsWith('.mjs')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(root,name)));
  }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'保存処理を完了できません。再読込で結果を確認してください'});else res.end();}
 });server.on('close',()=>{for(const c of clients)c.destroy();});return{server,store};
}
export function start(){const{server}=createServer();server.on('error',e=>{console.error('thdmn: '+e.message);process.exitCode=1;});server.listen(Number(process.env.THDMN_PORT||18742),'127.0.0.1',()=>console.log('thdmn http://127.0.0.1:'+server.address().port));return server;}
