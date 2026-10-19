export async function mountStructureBrowser(root,{fetchImpl=fetch}={}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const notice=el('p','合成構造データを読み込み中…'),nav=el('nav'),body=el('section');notice.setAttribute('role','status');root.replaceChildren(notice,nav,body);
 let turn=0;
 const button=(label,target)=>{const b=el('button',label);b.type='button';b.onclick=()=>show(target);return b;};
 async function read(path){const r=await fetchImpl(path,{cache:'no-store'});if(!r.ok)throw Error();return r.json();}
 async function show(target){const mine=++turn;notice.textContent='ページを読み込み中…';try{const data=await read('/api/v02/structure/pages/'+target.kind+'/'+encodeURIComponent(target.id));if(mine!==turn)return;
  body.replaceChildren();const trail=el('nav');trail.setAttribute('aria-label','親の経路');for(const p of data.breadcrumbs)trail.append(button(p.kind+': '+p.title,p));if(data.breadcrumbBoundary)trail.prepend(el('span','この先の親は表示できません'));
  body.append(trail,el('h2',data.page.kind+': '+data.page.title));
  const list=el('div');list.className='entries';for(const row of data.entries){const card=el('article');card.dataset.entryId=row.entryId;card.append(el('span',row.kind==='reference'?'参照 #'+row.referenceId:'実体Task'),button(row.title,row.target));list.append(card);}body.append(list);
  const deps=el('section');deps.append(el('h3','前提（同じ親の配置・参照を含む）'));for(const edge of data.prerequisites){const from=data.entries.find(x=>x.entryId===edge.fromEntryId),to=data.entries.find(x=>x.entryId===edge.toEntryId);deps.append(el('p',(from.kind==='reference'?'参照 #'+from.referenceId+'：':'実体：')+from.title+' → '+(to.kind==='reference'?'参照 #'+to.referenceId+'：':'実体：')+to.title));}body.append(deps,el('p','完了状態と他ページへの依存効果は、この試作ではまだ計算しません。'));notice.textContent='合成データ / 読取専用 / 未公開';
 }catch{if(mine===turn){body.replaceChildren();notice.textContent='ページを表示できません';}}}
 try{const data=await read('/api/v02/structure/roots');for(const p of data.pages)nav.append(button(p.kind+': '+p.title,p));if(data.pages.length)await show(data.pages[0]);else notice.textContent='表示できるページはありません';}catch{notice.textContent='構造データを読み込めません';}
}
