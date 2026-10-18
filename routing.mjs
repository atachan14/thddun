// Orthogonal visibility-grid A*. Obstacles represent card content, never hierarchy edges.
export function routeOrthogonal(start,end,obstacles,width,height){
  const round=n=>Math.round(n*10)/10;
  const xs=[...new Set([0,width,start.x,end.x,...obstacles.flatMap(r=>[r.left,r.right])].map(round))].filter(x=>x>=0&&x<=width).sort((a,b)=>a-b);
  const ys=[...new Set([0,height,start.y,end.y,...obstacles.flatMap(r=>[r.top,r.bottom])].map(round))].filter(y=>y>=0&&y<=height).sort((a,b)=>a-b);
  const blocked=(a,b)=>obstacles.some(r=>a.x===b.x?a.x>r.left+.01&&a.x<r.right-.01&&Math.max(a.y,b.y)>r.top+.01&&Math.min(a.y,b.y)<r.bottom-.01:a.y>r.top+.01&&a.y<r.bottom-.01&&Math.max(a.x,b.x)>r.left+.01&&Math.min(a.x,b.x)<r.right-.01);
  const sx=xs.indexOf(round(start.x)),sy=ys.indexOf(round(start.y)),ex=xs.indexOf(round(end.x)),ey=ys.indexOf(round(end.y));
  const key=(x,y,d)=>`${x},${y},${d}`,heap=[];
  function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;}
  function pop(){const n=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return n;}
  const scores=new Map(),origin=key(sx,sy,0);scores.set(origin,0);push({x:sx,y:sy,d:0,g:0,f:0,k:origin});let winner;
  while(heap.length){const cur=pop();if(cur.g!==scores.get(cur.k))continue;if(cur.x===ex&&cur.y===ey){winner=cur;break;}for(const[dx,dy,d]of[[1,0,1],[-1,0,1],[0,1,2],[0,-1,2]]){const x=cur.x+dx,y=cur.y+dy;if(x<0||y<0||x>=xs.length||y>=ys.length)continue;const a={x:xs[cur.x],y:ys[cur.y]},b={x:xs[x],y:ys[y]};if(blocked(a,b))continue;const g=cur.g+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(cur.d&&cur.d!==d?12:0),k=key(x,y,d);if(g>=(scores.get(k)??Infinity))continue;scores.set(k,g);push({x,y,d,g,k,prev:cur,f:g+Math.abs(xs[x]-end.x)+Math.abs(ys[y]-end.y)});}}
  if(!winner)return null;const points=[];for(let n=winner;n;n=n.prev)points.push({x:xs[n.x],y:ys[n.y]});points.reverse();return points.filter((p,i)=>!i||i===points.length-1||(points[i-1].x===p.x)!==(p.x===points[i+1].x));
}
