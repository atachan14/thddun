// The single Task completion predicate. Readiness/dependencies never change this fact.
export function isTaskComplete(task){const assignees=task?.assignees||[],states=task?.workStates||{};return assignees.length>0&&assignees.every(id=>(states[id]?.state||states[id])==='done');}

// Existing Card aggregate display rule, shared with readonly sidebar rows.
export function taskAggregateState(task){if(isTaskComplete(task))return'done';const ids=task?.assignees||[],states=task?.workStates||{},state=id=>states[id]?.state||states[id];return ids.some(id=>state(id)==='doing')?'doing':ids.some(id=>state(id)==='hold')?'hold':'todo';}
