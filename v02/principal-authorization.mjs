// Use inside the repository transaction. No connection or credentials are created here.
import{ApiError}from'./domain-draft.mjs';
export async function authorizeCurrentPrincipal(client,context,workspaceId,action){
 const{rows}=await client.query(`SELECT a.external_subject,p.kind,p.owner_account_id,p.disabled,a.disabled AS human_disabled,o.disabled AS owner_disabled,
 EXISTS(SELECT 1 FROM principal_permissions x WHERE x.principal_id=p.id AND x.workspace_id=$2 AND x.action=$3) AS permitted,
 EXISTS(SELECT 1 FROM service_credentials c JOIN credential_workspaces w ON w.credential_id=c.id JOIN credential_actions z ON z.credential_id=c.id WHERE c.id=$4 AND c.principal_id=p.id AND c.revoked_at IS NULL AND c.expires_at>CURRENT_TIMESTAMP AND w.workspace_id=$2 AND z.action=$3) AS credential_permitted
 FROM principals p LEFT JOIN accounts a ON a.id=p.account_id LEFT JOIN accounts o ON o.id=p.owner_account_id WHERE p.id=$1`,[context.subjectId,workspaceId,action,context.credentialId||null]);
 const p=rows[0];if(!p||p.disabled||p.kind!==(context.principalKind||'human'))throw new ApiError(401,'Invalid authentication');
 if(p.kind==='human'&&(p.human_disabled!==false||context.credentialId||!context.identitySubjectId||p.external_subject!==context.identitySubjectId))throw new ApiError(401,'Invalid authentication');
 if(p.kind==='service'&&(p.owner_disabled!==false||p.owner_account_id!==context.ownerAccountId||!p.credential_permitted))throw new ApiError(401,'Invalid authentication');
 if(!p.permitted)throw new ApiError(404,'Not found');
}
