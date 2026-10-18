// Display-only SCC condensation; an aggregate cycle never becomes a data dependency.
export function layeredLayout(nodes,edges,{gapX=100,gapY=24,padding=36}={}){
 const byId=new Map(nodes.map(n=>[n.id,n])),ids=[...byId.keys()].sort(),out=new Map(ids.map(id=>[id,new Set()])),incoming=new Map(ids.map(id=>[id,new Set()]));
 for(const{from,to}of edges)if(byId.has(from)&&byId.has(to)&&from!==to){out.get(from).add(to);incoming.get(to).add(from);}
 let serial=0;const index=new Map(),low=new Map(),stack=[],on=new Set(),components=[];
 function visit(id){index.set(id,serial);low.set(id,serial++);stack.push(id);on.add(id);for(const next of [...out.get(id)].sort()){if(!index.has(next)){visit(next);low.set(id,Math.min(low.get(id),low.get(next)));}else if(on.has(next))low.set(id,Math.min(low.get(id),index.get(next)));}if(low.get(id)===index.get(id)){const c=[];let n;do{n=stack.pop();on.delete(n);c.push(n);}while(n!==id);components.push(c.sort());}}
 ids.forEach(id=>{if(!index.has(id))visit(id);});const componentOf=new Map();components.forEach((c,i)=>c.forEach(id=>componentOf.set(id,i)));const parents=components.map(()=>new Set()),children=components.map(()=>new Set());for(const id of ids)for(const to of out.get(id)){const a=componentOf.get(id),b=componentOf.get(to);if(a!==b){children[a].add(b);parents[b].add(a);}}
 const rank=new Map();function depth(c){if(!rank.has(c))rank.set(c,children[c].size?Math.max(...[...children[c]].map(depth))+1:0);return rank.get(c);}components.forEach((_,i)=>depth(i));const layers=[];for(const id of ids){const r=rank.get(componentOf.get(id));(layers[r]??=[]).push(id);}
 const position=new Map();const refresh=()=>layers.forEach(layer=>layer.forEach((id,i)=>position.set(id,i)));refresh();
 // Barycentric sweeps with successor-set blocks keep siblings together and reduce crossings.
 for(let pass=0;pass<6;pass++){const forward=pass%2===0,order=forward?layers.map((_,i)=>i):layers.map((_,i)=>i).reverse();for(const r of order){const layer=layers[r],score=id=>{const peers=[...(forward?out.get(id):incoming.get(id))].filter(n=>rank.get(componentOf.get(n))!==r);return peers.length?peers.reduce((n,id)=>n+position.get(id),0)/peers.length:position.get(id);};const groups=new Map();for(const id of layer){const key=[...out.get(id)].sort().join('\u0000')||'root:'+id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}const blocks=[...groups.values()];blocks.sort((a,b)=>a.reduce((n,id)=>n+score(id),0)/a.length-b.reduce((n,id)=>n+score(id),0)/b.length||a[0].localeCompare(b[0],'en'));layers[r]=blocks.flatMap(block=>block.sort((a,b)=>score(a)-score(b)||a.localeCompare(b,'en')));refresh();}}
 // Stable successor-set order and completion partition within each dependency rank.
 for(const layer of layers){const blocks=new Map();for(const id of layer){const key=[...out.get(id)].sort().join('\u0000')||'goals';if(!blocks.has(key))blocks.set(key,[]);blocks.get(key).push(id);}layer.splice(0,layer.length,...[...blocks.values()].flatMap(b=>[...b.filter(id=>!byId.get(id).done),...b.filter(id=>byId.get(id).done)]));}
 const result=new Map(),bands=[];let x=padding,bottom=padding;
 for(let r=0;r<layers.length;r++){
  const layer=layers[r],columns=[[...layer.filter(id=>!byId.get(id).done),...layer.filter(id=>byId.get(id).done)]];
  const start=x;let bandBottom=padding;
  columns.forEach((column,subcolumn)=>{let y=padding;for(const id of column){const node=byId.get(id);result.set(id,{x,y,width:node.width,height:node.height,rank:r,subcolumn,component:componentOf.get(id)});y+=node.height+gapY;}bandBottom=Math.max(bandBottom,y-gapY);x+=Math.max(0,...column.map(id=>byId.get(id).width))+36;});
  bands.push({rank:r,x:start-14,y:padding-14,width:Math.max(0,x-start-36)+28,height:bandBottom-padding+28,columns:columns.length});bottom=Math.max(bottom,bandBottom);x+=gapX-36;
 }
 return{positions:result,width:Math.max(320,x-gapX+padding),height:Math.max(160,bottom+padding),components:components.filter(c=>c.length>1),layers,bands};
}
