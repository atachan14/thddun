// Fictional comparison fixture; never merged into the user's existing ledger.
export function comparisonSeed(){
 const task=(id,name,parent,deps=[],assignee='ai')=>({id,name,parent,deps,state:'todo',eligible:['human','ai','team'],assignee});
 return{version:1,tasks:[task('root','制作',null,[],'team'),task('projectA','プロジェクトA','root'),task('projectB','プロジェクトB','root'),task('taskboard','thdmn','root'),task('calc','計算基盤','projectA'),task('milestone','検証工程','projectA'),task('ui','UI','projectA'),task('a1','A1','calc',[],'human'),task('a2','A2','calc',['b2']),task('a3','A3','calc',['a1','a2']),task('b1','B1：工程の検証（架空）','milestone',['a1']),task('b2','B2：工程の準備（架空）','milestone',[],'human'),task('u1','U1：画面（架空）','ui',['a3']),task('m1','M1：試験（架空）','projectB',['a3']),task('t1','T1：確認（架空）','taskboard',['m1'])],users:{sample:{favorites:[]}}};
}
