export function addDisclosure(host,entry,input,{label,closePopup}){
 const plus=document.createElement('button');plus.type='button';plus.className='open-add';plus.textContent='＋';plus.setAttribute('aria-label',label+'の追加欄を開く');plus.setAttribute('aria-expanded','false');
 const close=document.createElement('button');close.type='button';close.className='close-add';close.textContent='×';close.setAttribute('aria-label','追加欄を閉じる');
 entry.append(close);entry.hidden=true;host.append(plus);
 plus.onclick=()=>{entry.hidden=false;plus.hidden=true;plus.setAttribute('aria-expanded','true');input.focus();};
 close.onclick=()=>{closePopup?.();entry.hidden=true;plus.hidden=false;plus.setAttribute('aria-expanded','false');plus.focus();};
 return plus;
}
