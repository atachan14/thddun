export function taskAppearance(task,assignees,kids=[]){
 const states=assignees.map(id=>task.workStates?.[id]?.state??(task.completionMarks?.[id]?.done?'done':'todo'));
 const allDone=states.length>0&&states.every(s=>s==='done'),pendingChildren=allDone?kids.filter(t=>t.state!=='done').length:0,key=!states.length||states.every(s=>s==='todo')?'todo':allDone?(pendingChildren?'hold':'done'):states.includes('doing')?'doing':states.includes('hold')?'hold':states.includes('done')?'partial':'todo';
 const unknown=!!task.provenance&&assignees.some(id=>!task.workStates?.[id]);
 const label=pendingChildren?'子完了待ち':!states.length?'担当者なし':key==='todo'&&unknown?'担当状態未確認':({todo:'未着手',done:pendingChildren?'担当者完了':'完了',doing:'真っ最中',hold:'保留',partial:'一部完了'})[key];
 return{key,label,pendingChildren,unknown};
}
