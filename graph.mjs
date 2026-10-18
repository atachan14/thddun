import{layeredLayout}from'./layered-layout.mjs';
import{routeOrthogonal}from'./routing.mjs';
import{GraphCamera}from'./camera.mjs';
const ns='http://www.w3.org/2000/svg';
function html(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function svg(tag,attrs={}){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
export class DependencyGraph{
  constructor(board,details){
    this.board=board;this.details=details;this.focus='';this.zoom=1;this.frame=0;this.geometry=[];
    this.viewport=html('div',undefined,'graph-viewport');this.viewport.tabIndex=0;
    this.canvas=html('div',undefined,'graph-canvas');this.boundary=html('div',undefined,'graph-boundary');this.overlay=svg('svg',{'class':'dependency-overlay','aria-label':'必須前提の矢印'});
    board.before(this.viewport);this.viewport.append(this.canvas);this.bands=html('div',undefined,'graph-stage-bands');this.canvas.append(this.bands,this.boundary,board,this.overlay);
    this.camera=new GraphCamera(this.viewport,this.canvas,state=>{this.zoom=state.scale;if(this.view){this.view.camera=state;this.onCameraChange?.();}},()=>{if(this.camera?.autoFit)this.pendingFit=true;this.schedule();});
    this.viewport.setAttribute('aria-label','ホイールで縮尺、背景ドラッグで移動する依存図');
    this.observer=new ResizeObserver(()=>this.schedule());this.observer.observe(this.canvas);window.addEventListener('resize',()=>this.schedule());document.fonts?.ready.then(()=>this.schedule());
  }
  update(data,view,collapsed){
    if(view.mode==='drilldown'&&view.graphLayoutVersion!==2){view.camera=null;view.graphLayoutVersion=2;}this.data=data;this.view=view;this.collapsed=collapsed;this.drill=view.mode==='drilldown';this.active=view.mode==='nested'||this.drill;this.canvas.classList.toggle('graph-active',this.active);this.overlay.style.display=this.active?'':'none';this.boundary.replaceChildren();
    const byId=new Map(data.tasks.map(t=>[t.id,t]));this.byId=byId;this.inside=new Set();const visit=id=>{this.inside.add(id);data.tasks.filter(t=>t.parent===id).forEach(t=>visit(t.id));};if(view.root===null)for(const t of data.tasks)this.inside.add(t.id);else if(byId.has(view.root))visit(view.root);
    this.edges=data.tasks.flatMap(t=>t.deps.map(from=>({from,to:t.id}))).filter(e=>this.inside.has(e.from)||this.inside.has(e.to));
    if(this.focus&&!byId.has(this.focus))this.focus='';
    if(!this.drill){this.canvas.classList.remove('graph-layered');delete this.canvas.dataset.layered;this.canvas.style.height='';this.board.style.cssText='';for(const node of this.board.querySelectorAll('[data-task]'))node.style.cssText='';}
    this.pendingFit=this.active&&!view.camera;this.pendingReadable=this.pendingFit?true:null;this.camera.setEnabled(this.active,view.camera);this.zoom=this.active?this.camera.state.scale:1;this.schedule();
  }
  select(id){this.focus=id;this.schedule();}
  applyZoom(){this.camera.zoomAt(this.zoom);}
  schedule(){cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(()=>this.draw());}
  draw(){
    if(!this.data)return;this.boundary.replaceChildren();this.overlay.replaceChildren();this.details.replaceChildren();this.geometry=[];this.bands.replaceChildren();
    const cards=new Map([...this.board.querySelectorAll('[data-task]')].map(n=>[n.dataset.task,n]));
    for(const[id,n]of cards)n.classList.toggle('graph-selected',this.active&&id===this.focus);
    const focusSet=new Set();const expand=id=>{focusSet.add(id);this.data.tasks.filter(t=>t.parent===id).forEach(t=>expand(t.id));};if(this.focus)expand(this.focus);
    const edges=this.active?this.edges:this.edges.filter(e=>!this.focus||focusSet.has(e.from)||focusSet.has(e.to));
    const endpoints=new Map();
    const resolve=id=>{
      if(endpoints.has(id))return endpoints.get(id);
      let current=id;
      if(this.inside.has(id)){while(current&&!cards.has(current))current=this.byId.get(current)?.parent;if(current&&cards.has(current)){const end={key:current,node:cards.get(current),id:current,reason:current===id?'':this.drill?'子孫を集約':'折畳・絞込み内'};endpoints.set(id,end);return end;}}
      const reason=id===this.view.root?'表示起点（中央の外）':this.inside.has(id)?'絞込みで非表示':'起点外';
      const label=html('div',`${reason}：${this.byId.get(id).name}`,'boundary-node');label.dataset.boundary=id;this.boundary.append(label);const end={key:'external:'+id,node:label,id,reason};endpoints.set(id,end);return end;
    };
    const groups=new Map();for(const e of edges){const a=resolve(e.from),b=resolve(e.to),key=a.key+'→'+b.key;if(!groups.has(key))groups.set(key,{a,b,edges:[]});groups.get(key).edges.push(e);}
    this.boundary.hidden=!this.active||!this.boundary.children.length;
    if(!edges.length)this.details.append(html('p',this.focus?'選択したTaskと子孫に前提の接続はありません。':'この範囲には前提の接続がありません。'));
    if(!this.active){for(const e of edges)this.details.append(html('p',`${this.byId.get(e.from).state==='done'?'✓':'○'} ${this.byId.get(e.from).name} → ${this.byId.get(e.to).name}${!this.inside.has(e.from)||!this.inside.has(e.to)?' · 起点外への接続':''}`));return;}
    if(this.drill){this.canvas.classList.add('graph-layered');this.canvas.dataset.layered='true';this.board.style.display='block';this.board.style.position='absolute';this.board.style.inset='0';const nodeMap=new Map();for(const[id,node]of cards){Object.assign(node.style,{position:'absolute',width:'260px',margin:'0'});nodeMap.set(id,{id,node,width:260,height:node.offsetHeight,done:this.byId.get(id)?.state==='done'});}for(const end of endpoints.values())if(!nodeMap.has(end.key)){Object.assign(end.node.style,{position:'absolute',width:'220px',margin:'0'});nodeMap.set(end.key,{id:end.key,node:end.node,width:220,height:end.node.offsetHeight});}const layout=layeredLayout([...nodeMap.values()], [...groups.values()].map(g=>({from:g.a.key,to:g.b.key})));for(const[id,pos]of layout.positions){const node=nodeMap.get(id).node;node.style.left=pos.x+'px';node.style.top=pos.y+'px';node.dataset.rank=String(pos.rank);node.dataset.subcolumn=String(pos.subcolumn);}for(const band of layout.bands){const el=html('div',undefined,'graph-stage-band');Object.assign(el.style,{left:band.x+'px',top:band.y+'px',width:band.width+'px',height:band.height+'px'});el.dataset.rank=band.rank;el.setAttribute('aria-label',band.rank===0?'到達点':'前提段階 '+band.rank);this.bands.append(el);}if(this.camera.autoFit&&this.layout&&(layout.width!==this.layout.width||layout.height!==this.layout.height))this.pendingFit=true;this.canvas.style.width=layout.width+'px';this.canvas.style.height=layout.height+'px';this.canvas.dataset.displayCycles=String(layout.components.length);this.layout=layout;}else{this.canvas.classList.remove('graph-layered');delete this.canvas.dataset.layered;this.canvas.style.height='';this.board.style.cssText='';for(const node of cards.values())node.style.cssText='';}
    const origin=this.canvas.getBoundingClientRect(),z=this.zoom;
    const rect=n=>{const r=n.getBoundingClientRect();return{left:(r.left-origin.left)/z,top:(r.top-origin.top)/z,right:(r.right-origin.left)/z,bottom:(r.bottom-origin.top)/z};};
    const rawObstacles=[];for(const n of cards.values()){
      const r=rect(n),inner=n.querySelector(':scope > .children');if(inner)r.bottom=rect(inner).top-20;
      rawObstacles.push(r);
    }for(const n of this.boundary.children)rawObstacles.push(rect(n));
    const obstacles=rawObstacles.map(r=>({left:r.left-5,right:r.right+5,top:r.top-5,bottom:r.bottom+5}));
    const width=this.canvas.offsetWidth,height=this.canvas.offsetHeight;this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);this.overlay.setAttribute('width',width);this.overlay.setAttribute('height',height);
    const defs=svg('defs');for(const[color,name]of[['#f5c777','pending'],['#8cdbb5','done']]){const m=svg('marker',{id:'arrow-'+name,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:12,markerHeight:12,orient:'auto-start-reverse',markerUnits:'userSpaceOnUse'});m.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color}));defs.append(m);}this.overlay.append(defs);
    const labels=[];let number=0;for(const g of groups.values()){
      number++;const a=rect(g.a.node),b=rect(g.b.node),done=g.edges.every(e=>this.byId.get(e.from).state==='done'),aggregate=g.edges.some(e=>e.from!==g.a.id||e.to!==g.b.id),proxy=aggregate||!!g.a.reason||!!g.b.reason,reciprocal=g.a.key!==g.b.key&&groups.has(g.b.key+'→'+g.a.key);
      const contentRect=end=>{const r=rect(end.node),inner=end.node.querySelector(':scope > .children');if(inner)r.bottom=rect(inner).top-20;return r;};
      const ar=contentRect(g.a),br=contentRect(g.b);
      const port=(r,side,offset=0)=>{const y=Math.min(r.top+28+offset,r.bottom-12);return{point:{x:side==='left'?r.left:r.right,y},out:{x:side==='left'?r.left-14:r.right+14,y}};};
      const first=(a.left+a.right)<(b.left+b.right)?['right','left']:['left','right'];if(g.a.key===g.b.key)first.splice(0,2,'right','right');if(Math.abs(a.left-b.left)<5)first.splice(0,2,'right','right');
      let points=null;for(const[s,t]of[first,['right','right'],['left','left'],['left','right'],['right','left']]){
        const internal=g.a.key===g.b.key,offset=this.drill&&internal?Math.max(0,Math.min(80,ar.bottom-ar.top-84)):reciprocal&&g.a.key>g.b.key?40:0,start=port(ar,s,offset),end=port(br,t,internal?offset+24:offset),route=routeOrthogonal(start.out,end.out,obstacles,width,height);if(route){points=[start.point,...route,end.point];break;}
      }
      const row=html('div',undefined,'edge-detail');row.dataset.connection=String(number);row.dataset.kind=aggregate?'aggregate':'actual';const title=html('strong',`${number} · ${aggregate?'Σ 集約依存':'実Task依存'} · ${g.edges.length}接続${g.a.key===g.b.key?'（同じ親の内側）':''}`);row.append(title);
      if(aggregate)row.append(html('p','子孫の前提を集約。親自身の前提ではありません。','aggregation-note'));
      if(aggregate&&reciprocal)row.append(html('p','相互矢印は別々の子孫間の依存です。','reciprocal-note'));
      for(const e of g.edges){const entry=html('p',`${this.byId.get(e.from).state==='done'?'✓ 完了':'○ 未完了'} ${this.byId.get(e.from).name} → ${this.byId.get(e.to).name}`);row.append(entry);}
      if(g.a.reason==='起点外'||g.b.reason==='起点外')row.append(html('small','範囲外への接続'));
      if(this.highlightedConnection===g.a.key+'→'+g.b.key)row.classList.add('edge-selected');this.details.append(row);
      if(!points){row.append(html('p','経路を確保できません。折畳または接続範囲を絞って確認してください。','routing-warning'));continue;}
      const d=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),color=done?'#8cdbb5':'#f5c777',group=svg('g',{'class':'dependency-line',tabindex:0,role:'button','aria-label':`${number}：${aggregate?'集約依存：':''}`+g.edges.map(e=>'先に '+this.byId.get(e.from).name+'、完了後に '+this.byId.get(e.to).name).join('、'),'data-flow':'prerequisite-to-dependent','data-connection':number,'data-from':g.a.key,'data-to':g.b.key,'data-proxy':proxy,'data-kind':aggregate?'aggregate':'actual','data-reciprocal':reciprocal});
      const related=!this.focus||g.edges.some(e=>focusSet.has(e.from)||focusSet.has(e.to));group.classList.toggle('edge-muted',!related);group.classList.toggle('edge-related',!!this.focus&&related);const titleSvg=svg('title');titleSvg.textContent=group.getAttribute('aria-label');group.append(titleSvg,svg('path',{d,stroke:'#101620','stroke-width':7,fill:'none','stroke-linejoin':'round'}),svg('path',{d,stroke:color,'stroke-width':2,fill:'none','stroke-dasharray':aggregate?'7 4':proxy?'2 4':'none','marker-end':`url(#arrow-${done?'done':'pending'})`,'class':'edge-stroke'}),svg('path',{d,stroke:'transparent','stroke-width':14,fill:'none','class':'edge-hit'}));
      // Prefer long segments, but keep number badges apart and out of card text.
      const radius=aggregate?13:10;let max=-Infinity,mid=points[1];for(let i=2;i<points.length-1;i++){const a=points[i-1],b=points[i],len=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);for(const fraction of [.5,.25,.75,.12,.88]){const p={x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};const collision=labels.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<radius+q.radius+5),textOverlap=rawObstacles.some(r=>p.x>r.left-radius&&p.x<r.right+radius&&p.y>r.top-radius&&p.y<r.bottom+radius);const score=len-(collision?100000:0)-(textOverlap?10000:0)-Math.abs(.5-fraction)*10;if(score>max){max=score;mid=p;}}}labels.push({...mid,radius});
      group.append(svg('circle',{cx:mid.x,cy:mid.y,r:aggregate?13:10,fill:'#152133',stroke:color}));const text=svg('text',{x:mid.x,y:mid.y+4,'text-anchor':'middle',fill:color,'font-size':11});text.textContent=String(number)+(aggregate?'Σ':'');group.append(text);
      if(this.highlightedConnection===g.a.key+'→'+g.b.key)group.classList.add('edge-selected');
      const show=()=>{this.highlightedConnection=g.a.key+'→'+g.b.key;this.overlay.querySelectorAll('.dependency-line').forEach(n=>n.classList.toggle('edge-selected',n===group));this.details.querySelectorAll('.edge-detail').forEach(n=>n.classList.toggle('edge-selected',n===row));this.details.closest('.relations').classList.add('open');this.details.closest('.relations').scrollTop=Math.max(0,row.offsetTop-this.details.closest('.relations').offsetTop-45);};group.addEventListener('click',show);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});this.overlay.append(group);
      this.geometry.push({number,points,obstacles:rawObstacles,from:g.a.key,to:g.b.key,proxy});
    }
    this.canvas.dataset.connections=String(groups.size);this.canvas.dataset.routed=String(this.geometry.length);
    if(this.pendingFit){this.pendingFit=false;this.camera.fit({readable:this.pendingReadable??this.camera.fitMode==='readable'});this.pendingReadable=null;this.zoom=this.camera.state.scale;}
  }
}
