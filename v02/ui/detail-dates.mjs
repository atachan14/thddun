import{officialTimestamp}from'./official-timestamp.mjs';
export function formatDetailDate(value){if(!value)return '未記録';return officialTimestamp(value)||'未記録';}
export function visibleAssignedTasks(snapshot,accountId){const a=snapshot.accountPages.find(a=>a.id===accountId);return a?(a.assignedTaskIds||[]).map(id=>snapshot.data.tasks.find(t=>t.id===id)).filter(Boolean):[];}
export function assignedCounts(snapshot,accountId){const tasks=visibleAssignedTasks(snapshot,accountId);return{done:tasks.filter(t=>t.cardCompletion?.completed===true).length,total:tasks.length};}

export function detailDateLine(el,created,label,last){const p=el('p');p.className='detail-dates';p.title='日本標準時 JST';p.append(el('span','作成日：'+formatDetailDate(created)),el('span',label+'：'+formatDetailDate(last)));return p;}
