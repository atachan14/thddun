export const TRIAL_SCHEMA='thdmn_v02_trial';
// Fixed namespace, set only inside each transaction; never take schema from a request.
export function scopedPool(pool){return{async connect(){const client=await pool.connect();return{async query(sql,args){const result=await client.query(sql,args);if(sql==='BEGIN ISOLATION LEVEL SERIALIZABLE')await client.query("SELECT set_config('search_path','thdmn_v02_trial,pg_catalog',true),set_config('statement_timeout','8000',true),set_config('lock_timeout','3000',true)");return result;},release(){client.release();}};}};}
