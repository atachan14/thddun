import{mountStructureBrowser}from'../structure/browser.mjs';
// Shares the existing authenticated transport. No new login, grant or management API.
export function structureShell({fetchImpl,workspaceId,canvas}){
 const panel=document.createElement('section');panel.id='structure-pages';panel.className='structure-pages';panel.hidden=true;document.querySelector('.site-shell').before(panel);
 const pages=document.createElement('button'),tasks=document.createElement('button');pages.id='structure-pages-toggle';pages.textContent='GroupPage・参照';tasks.id='structure-tasks-toggle';tasks.textContent='Taskの編集・状態';const toolbar=document.querySelector('.toolbar-modes');toolbar.prepend(pages);toolbar.append(tasks);let generation=0,active=false;
 function mode(show){panel.hidden=!show;document.querySelector('.site-shell').hidden=show;document.body.classList.toggle('structure-mode',show);pages.setAttribute('aria-pressed',String(show));tasks.setAttribute('aria-pressed',String(!show));}
 const transport=(path,options)=>{if(options?.method&&options.method!=='GET')throw Error('Structure management disabled');return fetchImpl(path+'?workspace='+encodeURIComponent(workspaceId),options);};
 async function load(){const mine=++generation;active=true;const target=document.createElement('div');panel.replaceChildren(target);mode(true);await mountStructureBrowser(target,{fetchImpl:transport,storageLabel:'PostgreSQL保存',dataLabel:'保存済みTask',readOnly:true,onOpenTask:async id=>{if(!active||mine!==generation)return;await canvas.load();if(mine!==generation)return;mode(false);canvas.openTask(id);}});if(mine!==generation)target.remove();}
 pages.onclick=()=>load();tasks.onclick=()=>{if(active){mode(false);canvas.load();}};
 return{load,clear(){active=false;generation++;panel.replaceChildren();mode(false);},destroy(){this.clear();panel.remove();pages.remove();tasks.remove();}};
}
