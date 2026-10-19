// Small synthetic contract example, not the live connection data or README dataset.
export function structureSample(){return{
 accounts:[{id:'demo-account',title:'合成Account'}],groups:[{id:'demo-group',title:'合成Group'}],
 tasks:[
  {id:'personal',title:'個人の実体Task',parent:{kind:'account',id:'demo-account'},assignees:['tester'],workStates:{tester:'done'}},
  {id:'project',title:'共同プロジェクト',parent:{kind:'group',id:'demo-group'},assignees:['tester'],workStates:{tester:'done'}},
  {id:'brief',title:'要件を確認',parent:{kind:'task',id:'project'},assignees:['tester'],workStates:{tester:'todo'}},
  {id:'build',title:'実装する',parent:{kind:'task',id:'project'},assignees:['tester'],workStates:{tester:'done'}}
 ],references:[
  {id:'personal-shortcut',taskId:'build',container:{kind:'account',id:'demo-account'}},
  {id:'second-shortcut',taskId:'build',container:{kind:'account',id:'demo-account'}},
  {id:'brief-shortcut',taskId:'brief',container:{kind:'account',id:'demo-account'}},
  {id:'group-shortcut',taskId:'personal',container:{kind:'group',id:'demo-group'}}
 ],dependencyEdges:[
  {id:'project-work',container:{kind:'task',id:'project'},fromEntryId:'task:brief',toEntryId:'task:build'},
  {id:'cross-parent-work',container:{kind:'account',id:'demo-account'},fromEntryId:'reference:personal-shortcut',toEntryId:'task:personal'}
 ]};}
