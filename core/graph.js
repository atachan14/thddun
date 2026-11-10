// 前提(requires)の線についての計算。

/**
 * 前提の循環を探す。循環ごとに、ID の並びを返す(2つ以上の Topic が互いに前提になっている塊)。
 * 自分自身への前提は workspace.js で先に外しているので、ここでは出てこない。
 * Tarjan の強連結成分のアルゴリズム(再帰を使わない形)。
 */
export function findRequireCycles(topics) {
  const edges = new Map(topics.map((t) => [t.id, t.requires]));
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let counter = 0;

  for (const start of edges.keys()) {
    if (index.has(start)) continue;
    const work = [{ id: start, next: 0 }];
    index.set(start, counter);
    low.set(start, counter);
    counter++;
    stack.push(start);
    onStack.add(start);

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const targets = edges.get(frame.id) ?? [];
      if (frame.next < targets.length) {
        const to = targets[frame.next++];
        if (!edges.has(to)) continue;
        if (!index.has(to)) {
          index.set(to, counter);
          low.set(to, counter);
          counter++;
          stack.push(to);
          onStack.add(to);
          work.push({ id: to, next: 0 });
        } else if (onStack.has(to)) {
          low.set(frame.id, Math.min(low.get(frame.id), index.get(to)));
        }
        continue;
      }

      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].id;
        low.set(parent, Math.min(low.get(parent), low.get(frame.id)));
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const component = [];
        let id;
        do {
          id = stack.pop();
          onStack.delete(id);
          component.push(id);
        } while (id !== frame.id);
        if (component.length > 1) cycles.push(component.reverse());
      }
    }
  }
  return cycles;
}

/**
 * from の前提に to を足すと循環になるか。to から前提をたどって from に着けば循環。
 * 編集で前提を足す前に確かめる(作るときは循環を禁止する)。
 */
export function wouldCreateCycle(topics, from, to) {
  if (from === to) return true;
  const edges = new Map(topics.map((t) => [t.id, t.requires]));
  const seen = new Set();
  const queue = [to];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(edges.get(id) ?? []));
  }
  return false;
}
