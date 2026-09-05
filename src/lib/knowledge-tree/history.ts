import type { KnowledgeTree, LearningEvent } from "./types.ts";

/** Legacy timestamps are observed evidence, never proof of a complete history. */
export function hydrateHistory(tree: KnowledgeTree): KnowledgeTree {
  if (tree.learningHistory) return tree;
  const events: LearningEvent[] = [];
  const nodes = tree.nodes.map(n => {
    const history = n.statusHistory.length ? n.statusHistory : n.statusChangedAt
      ? [{ from: "todo", to: n.status, at: n.statusChangedAt }] : [];
    for (const h of history) events.push({ ...h, id: `legacy-${events.length}`, nodeId: n.id, title: n.title, priority: n.priority, firstDone: false });
    const first = history.filter(h => h.to === "done").map(h => h.at).sort()[0] ?? null;
    return { ...n, firstDoneAt: n.firstDoneAt ?? first, firstDoneExact: false };
  });
  return { ...tree, nodes, learningHistory: events, historyComplete: false, historyCompleteSince: null };
}

export function historyKnownSince(tree: KnowledgeTree, start: Date): boolean {
  return tree.historyComplete === true || Boolean(tree.historyCompleteSince && new Date(tree.historyCompleteSince) <= start);
}
