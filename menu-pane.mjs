export class MenuPane{
 constructor(pane,toggle,container,options={}){
  Object.assign(this,{pane,toggle,container,side:'left',storageKey:'taskboard.menuPane',minimum:140,defaultWidth:166,available:()=>innerWidth-480,disabled:()=>false,...options,narrow:innerWidth<=650,temporary:false,drag:null});
  this.state={width:this.defaultWidth,height:200,collapsed:this.side==='left'&&this.narrow};try{const s=JSON.parse(localStorage.getItem(this.storageKey)||'null');if(s&&Number.isFinite(s.width)&&typeof s.collapsed==='boolean')this.state={width:Math.max(this.minimum,s.width),height:Number.isFinite(s.height)?Math.max(100,s.height):200,collapsed:s.collapsed};}catch{}
  this.handle=document.createElement('div');this.handle.className='pane-resizer '+(this.side==='left'?'menu-resizer':'detail-resizer');this.handle.tabIndex=0;this.handle.setAttribute('role','separator');this.handle.setAttribute('aria-label',this.side==='left'?'メニュー幅':'詳細の幅');this.handle.title='ドラッグでサイズ変更。矢印キー、Escapeで収納';container.append(this.handle);
  toggle.setAttribute('aria-controls',pane.id);toggle.onclick=()=>this.setCollapsed(!this.closed());
  this.handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();this.handle.focus({preventScroll:true});this.drag={id:e.pointerId,start:this.coordinate(e),size:this.size(),original:this.preferred(),candidate:false,current:this.size()};this.handle.setPointerCapture(e.pointerId);document.body.classList.add('pane-dragging');});
  this.handle.addEventListener('pointermove',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const raw=d.size+(this.coordinate(e)-d.start)*(this.side==='left'?1:-1),min=this.min();if(raw<min-48)d.candidate=true;else if(raw>min-24)d.candidate=false;d.current=Math.min(this.max(),Math.max(min,raw));this.render(d.current);this.handle.classList.toggle('collapse-ready',d.candidate);});
  this.handle.addEventListener('pointerup',e=>this.finish(e,true));this.handle.addEventListener('pointercancel',e=>this.finish(e,false));this.handle.addEventListener('lostpointercapture',e=>{if(this.drag)this.finish(e,false);});this.handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  this.handle.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();this.setCollapsed(true);return;}const vertical=this.vertical(),grow=vertical?'ArrowUp':this.side==='left'?'ArrowRight':'ArrowLeft',shrink=vertical?'ArrowDown':this.side==='left'?'ArrowLeft':'ArrowRight';let next;if(e.key===grow)next=this.size()+16;else if(e.key===shrink)next=this.size()-16;else if(e.key==='Home')next=this.min();else if(e.key==='End')next=this.max();else return;e.preventDefault();this.storeSize(Math.min(this.max(),Math.max(this.min(),next)));this.render();this.save();});
  this.onResize=()=>{if(this.drag)this.finish({pointerId:this.drag.id},false);const next=innerWidth<=650;if(this.side==='left'&&next&&!this.narrow)this.temporary=true;if(!next)this.temporary=false;this.narrow=next;this.render();};window.addEventListener('resize',this.onResize);this.render();
 }
 destroy(){window.removeEventListener('resize',this.onResize);this.handle.remove();}
 vertical(){return this.side==='right'&&innerWidth<=650;}
 min(){return this.vertical()?100:this.minimum;}
 max(){return Math.max(this.min(),this.vertical()?this.container.clientHeight-180:this.available());}
 preferred(){return this.vertical()?this.state.height:this.state.width;}
 storeSize(value){if(this.vertical())this.state.height=value;else this.state.width=value;}
 size(){return Math.min(this.max(),Math.max(this.min(),this.preferred()));}
 occupied(){return this.closed()||this.disabled()||this.vertical()?0:this.renderedSize||this.size();}
 closed(){return this.state.collapsed||this.temporary;}
 coordinate(e){return this.vertical()?e.clientY:e.clientX;}
 save(){localStorage.setItem(this.storageKey,JSON.stringify(this.state));}
 setCollapsed(value){this.state.collapsed=value;this.temporary=false;const focus=value&&(this.pane.contains(document.activeElement)||document.activeElement===this.handle);this.render();this.save();if(focus)this.toggle.focus({preventScroll:true});}
 render(size=this.size()){
  const disabled=this.disabled(),closed=this.closed()||disabled,which=this.side==='left'?'menu':'detail';this.renderedSize=closed?0:size;document.documentElement.style.setProperty('--'+which+'-size',this.renderedSize+'px');document.body.classList.toggle(which+'-collapsed',closed);if(this.side==='left')document.body.classList.toggle('menu-open',!closed);
  this.pane.inert=closed;this.pane.setAttribute('aria-hidden',String(closed));this.toggle.hidden=disabled;this.toggle.setAttribute('aria-expanded',String(!closed));this.toggle.setAttribute('aria-label',(this.side==='left'?'メニュー':'詳細')+(closed?'を開く':'を閉じる'));this.handle.hidden=closed;this.handle.setAttribute('aria-orientation',this.vertical()?'horizontal':'vertical');this.handle.setAttribute('aria-valuemin',this.min());this.handle.setAttribute('aria-valuemax',Math.round(this.max()));this.handle.setAttribute('aria-valuenow',Math.round(size));
 }
 finish(e,commit){const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;if(this.handle.hasPointerCapture(d.id))this.handle.releasePointerCapture(d.id);document.body.classList.remove('pane-dragging');this.handle.classList.remove('collapse-ready');if(commit){if(d.candidate){this.storeSize(d.original);this.setCollapsed(true);}else{this.storeSize(d.current);this.render();this.save();}}else this.render();}
}
