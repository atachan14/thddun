// Offline fixture-only savepoints. Nothing here opens a driver or reads DATABASE_URL.
export async function sampleTransaction(db, work) {
  await db.exec('BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL search_path=thdmn_v02_trial,pg_catalog');
  let serial=0;
  const pool={async connect(){let savepoint=null;return{async query(sql,args=[]){
    if(sql==='BEGIN ISOLATION LEVEL SERIALIZABLE'){savepoint='sample_unit_'+(++serial);await db.exec('SAVEPOINT '+savepoint);return{rows:[]};}
    if(sql==='COMMIT'){await db.exec('RELEASE SAVEPOINT '+savepoint);return{rows:[]};}
    if(sql==='ROLLBACK'){await db.exec('ROLLBACK TO SAVEPOINT '+savepoint+'; RELEASE SAVEPOINT '+savepoint);return{rows:[]};}
    return db.query(sql,args);
  },release(){}};}};
  try{const result=await work(pool);await db.exec('COMMIT');return result;}
  catch(error){await db.exec('ROLLBACK');throw error;}
}

export async function existingRows(db,workspace){
  const names=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='thdmn_v02_trial' ORDER BY tablename")).rows.map(r=>r.tablename),tables={};
  for(const name of names){if(!/^[a-z_]+$/.test(name))throw Error('Unsafe fixture table');const query='SELECT to_jsonb(t) AS row FROM '+name+' t'+(name==='workspace_revisions'?' WHERE workspace_id<>$1':'');tables[name]=(await db.query(query,name==='workspace_revisions'?[workspace]:[])).rows.map(r=>JSON.stringify(r.row));}
  const revision=(await db.query('SELECT revision FROM workspace_revisions WHERE workspace_id=$1',[workspace])).rows[0]?.revision;
  return{tables,revision:Number(revision)};
}

export async function assertExistingRows(db,workspace,before){
  const after=await existingRows(db,workspace);let preserved=0;
  for(const[name,rows]of Object.entries(before.tables)){const counts=new Map();for(const row of after.tables[name]||[])counts.set(row,(counts.get(row)||0)+1);for(const row of rows){if(!counts.get(row))throw Error('Existing records changed in '+name);counts.set(row,counts.get(row)-1);preserved++;}}
  if(after.revision<before.revision)throw Error('Workspace revision regressed');
  return{tables:Object.keys(before.tables).length,rows:preserved};
}
