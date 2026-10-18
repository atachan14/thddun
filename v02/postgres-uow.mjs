// Inject a pg-compatible pool. No driver or connection is created here.
export async function transaction(pool,work){const client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');try{const result=await work(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}}finally{client.release();}}
