let active;
function close(){active?.close();}
window.addEventListener('blur',close);
document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
document.addEventListener('pointerdown',e=>{if(active&&e.target!==active.input&&!active.list.contains(e.target))close();},true);
document.addEventListener('click',e=>{if(active&&e.target!==active.input&&!active.list.contains(e.target))close();},true);
document.addEventListener('focusin',e=>{if(active&&e.target!==active.input&&!active.list.contains(e.target))close();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();e.stopPropagation();close();}},true);
export function bindSuggestions(input,list){
 const popup={input,list,close(){list.hidden=true;input.setAttribute('aria-expanded','false');if(active===popup)active=null;},open(){if(active!==popup)close();active=popup;list.hidden=false;input.setAttribute('aria-expanded','true');}};
 input.setAttribute('aria-expanded','false');return popup;
}
