// Authorized DTO projection only. Mutations and effective access remain in PolicyRepository.
import { loadAssignedPositions, projectedAssignedPositions } from "./assigned-placements.mjs";
import { fieldProjection } from "./fields.mjs";
import { assignmentEntries } from "./assignment.mjs";
import { cardSummaries } from "./card-summary.mjs";
import { subtreePlan, visibleTrash } from "./account-lifecycle.mjs";
import { policyDescription, projectedPositions } from "./detail-placement.mjs";
import { projectPage } from "../structure/contract.mjs";
const subtree = (s, id) => subtreePlan(s, { kind: "task", id });
async function projectPolicySnapshot(client, s, context, workspace) {
  const hasDates = (await client.query("SELECT to_regclass('thdmn_v02_trial.local_page_metadata') AS present")).rows[0].present;
  const metadata = hasDates ? (await client.query("SELECT * FROM local_page_metadata")).rows : [];
  const dates = (kind, id) => {
    const m = metadata.find((m2) => m2.kind === kind && m2.entity_id === id);
    return { createdAt: m?.created_at || null, lastCompletedAt: m?.last_completed_at || null, lastLoginAt: m?.last_login_at || null, ...kind === "account" ? { details: m?.details || "" } : {} };
  };
  const signupDates = (await client.query("SELECT o.page_id,c.created_at,c.username FROM account_page_owners o JOIN local_auth_credentials c ON c.principal_id=o.principal_id")).rows;
  const assignedPositions = await loadAssignedPositions(client, workspace);
  const positions = (await client.query("SELECT * FROM local_card_positions WHERE workspace_id=$1", [workspace])).rows, fields = (await client.query("SELECT id,custom_fields FROM tasks WHERE workspace_id=$1", [workspace])).rows;
  const cardSummary = cardSummaries({ ...s.model, tasks: s.model.tasks.filter((t) => !s.deletedIds.has(t.id)), accounts: s.model.accounts.filter((a) => !s.deletedAccountIds.has(a.id)) }, s.accounts, (p) => s.access.canReadPage(context, p));
  const visible = s.data.tasks.filter((t) => s.access.canReadTask(context, t.id)), ids = new Set(visible.map((t) => t.id)), rank = (p) => s.access.rank(p), caps = (p, parent) => ({ editContent: rank(p) >= 3, createChild: rank(p) >= 2, managePolicy: rank(p) >= 3, delete: rank(p) >= 3 && subtreePlan(s, p).canDelete, move: (!parent || rank(parent) >= 3) && (p.kind !== "account" || rank(p) >= 3), manageParticipants: false });
  const peopleRows = (await client.query("SELECT id,display_name AS name FROM principals WHERE id=ANY($1::text[])", [[.../* @__PURE__ */ new Set([context.subjectId, ...visible.flatMap((t) => t.assignees)])]])).rows;
  const people = peopleRows.map((p) => {
    const owner = s.accounts.find((o) => o.principal_id === p.id);
    return { ...p, nameIsIdentifier: !!owner && rank({ kind: "account", id: owner.page_id }) < 1, name: owner && rank({ kind: "account", id: owner.page_id }) < 1 ? s.publicId({ kind: "account", id: owner.page_id }) ? "@" + s.publicId({ kind: "account", id: owner.page_id }) : "\u975E\u516C\u958BAccount" : p.name };
  });
  const tasks = visible.map((t) => {
    const p = { kind: "task", id: t.id }, parent = s.model.tasks.find((x) => x.id === t.id).parent;
    return { ...fieldProjection(s, p, metadata), ...dates("task", t.id), policyEntries: policyDescription(s, p, context.subjectId), customFields: fields.find((f) => f.id === t.id)?.custom_fields || {}, ...cardSummary(p), id: t.id, publicId: s.publicId(p), title: t.title, details: t.details, parentId: parent.kind === "task" && ids.has(parent.id) ? parent.id : null, parentPage: s.access.canReadPage(context, parent) ? parent : null, stageManaged: true, permission: ["none", "view", "add", "manage"][rank(p)], sharedRoot: parent.kind === "account" && !s.access.canReadPage(context, parent), capabilities: caps(p, parent), ...rank(p) >= 3 ? { deletionPlan: subtree(s, t.id) } : {}, assignees: t.assignees, assigneeEntries: assignmentEntries(s, t, context.subjectId), workStates: t.workStates, prerequisiteIds: t.prerequisiteIds.filter((id) => ids.has(id)), completion: projectPage(s.model, context, p, s.access).pageTask.completion, readiness: projectPage(s.model, context, p, s.access).pageTask.readiness };
  });
  const accountPages = s.model.accounts.filter((a) => rank({ kind: "account", id: a.id }) >= 1).map((a) => ({ ...fieldProjection(s, { kind: "account", id: a.id }, metadata), ...dates("account", a.id), createdAt: dates("account", a.id).createdAt || signupDates.find((x) => x.page_id === a.id)?.created_at || null, policyEntries: policyDescription(s, { kind: "account", id: a.id }, context.subjectId), assignedTaskIds: tasks.filter((t) => t.assignees.some((id) => s.accounts.some((o) => o.page_id === a.id && o.principal_id === id))).map((t) => t.id), ...cardSummary({ kind: "account", id: a.id }), id: a.id, publicId: s.publicId({ kind: "account", id: a.id }), title: a.title, parent: a.parent && s.access.canReadPage(context, a.parent) ? a.parent : null, permission: ["none", "view", "add", "manage"][rank({ kind: "account", id: a.id })], capabilities: caps({ kind: "account", id: a.id }, a.parent), ...rank({ kind: "account", id: a.id }) >= 3 ? { deletionPlan: subtreePlan(s, { kind: "account", id: a.id }) } : {} }));
  const accountFormReady = !!hasDates;
  return { revision: s.revision, actorPrincipalId: context.subjectId, actorAccountId: s.publicId({ kind: "account", id: s.accounts.find((o) => o.principal_id === context.subjectId)?.page_id }), stageOne: true, policyCore: true, fieldModelReady: !!s.fields, assignedPlacementReady: assignedPositions !== null, lastLoginFieldReady: !!s.fields?.definitions.some((d) => d.id === "thdmn.last_login_at"), accountFormReady, accountPages, accountSuggestions: accountPages.filter((a) => a.publicId).map((a) => ({ publicId: a.publicId, title: a.title, pageId: a.id })), trash: visibleTrash(s), data: { tasks, users: people, references: s.model.references.filter((r) => ids.has(r.taskId) && s.access.canReadPage(context, r.container)), placements: projectedPositions(s, positions), assignedPlacements: projectedAssignedPositions(s, assignedPositions), docs: s.data.docs.filter((d) => ids.has(d.taskId)) } };
}
export {
  projectPolicySnapshot
};
