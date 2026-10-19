// Report only capabilities already returned by the authorized snapshot.
// This is a read-only diagnostic, never an authorization decision or credential probe.
export function readiness(snapshot) {
 if (!Number.isSafeInteger(snapshot?.revision) || !Array.isArray(snapshot?.data?.tasks)) throw Error('Invalid snapshot');
 const actor = snapshot.actorPrincipalId;
 return {
  revision: snapshot.revision,
  visibleTasks: snapshot.data.tasks.length,
  createParentIds: snapshot.data.tasks.filter(t=>t.capabilities?.createChild===true).map(t=>t.id),
  editableTaskIds: snapshot.data.tasks.filter(t=>t.capabilities?.editContent===true).map(t=>t.id),
  ownStateTaskIds: typeof actor==='string' ? snapshot.data.tasks.filter(t=>t.assignees?.includes(actor)).map(t=>t.id) : [],
  actorKnown: typeof actor==='string'
 };
}
