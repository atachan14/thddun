// 完了と前提待ち(docs/REQUIREMENTS.md の 9 章)。
//
// - 担当がある Topic: 担当者が全員「完了扱いの状態」で、担当のある子も全部完了なら、完了。
// - 担当のない Topic: 完了かどうかは持たない。担当のある子があれば、何件中何件が完了かを出す。
// - 前提待ち: 前提の Topic のどれかが済んでいない。完了の条件には入れない。
//   済んでいないのは、担当があって未完了の Topic と、進み具合が全部そろっていない Topic。

/**
 * @returns {Map<string, { kind: "assigned", done: boolean } | { kind: "group", done: number, total: number } | { kind: "none" }>}
 *   どの値にも waiting(前提待ちか)と waitingFor(済んでいない前提の ID)が付く
 */
export function computeStatuses(topics, settings) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const doneStates = new Set(settings.doneStates);
  const memo = new Map();

  // 担当がある Topic の完了。子をたどるので覚えておく(親子は循環しない)
  const isAssignedDone = (topic) => {
    if (memo.has(topic.id)) return memo.get(topic.id);
    const selfDone = topic.assignees.every((a) => doneStates.has(a.state));
    const childrenDone = topic.childIds
      .map((id) => byId.get(id))
      .filter((child) => child && child.assignees.length > 0)
      .every(isAssignedDone);
    const done = selfDone && childrenDone;
    memo.set(topic.id, done);
    return done;
  };

  const base = new Map();
  for (const t of topics) {
    if (t.assignees.length > 0) {
      base.set(t.id, { kind: "assigned", done: isAssignedDone(t) });
      continue;
    }
    const assignedChildren = t.childIds.map((id) => byId.get(id)).filter((c) => c && c.assignees.length > 0);
    if (assignedChildren.length > 0) {
      base.set(t.id, {
        kind: "group",
        done: assignedChildren.filter(isAssignedDone).length,
        total: assignedChildren.length,
      });
    } else {
      base.set(t.id, { kind: "none" });
    }
  }

  const isSettled = (id) => {
    const s = base.get(id);
    if (!s) return true;
    if (s.kind === "assigned") return s.done;
    if (s.kind === "group") return s.done === s.total;
    return true;
  };

  const result = new Map();
  for (const t of topics) {
    const waitingFor = t.requires.filter((id) => !isSettled(id));
    result.set(t.id, { ...base.get(t.id), waiting: waitingFor.length > 0, waitingFor });
  }
  return result;
}
