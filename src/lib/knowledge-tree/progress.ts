import type { KnowledgeNode, KnowledgeTree, NodeStatus, PracticeLog } from "./types.ts";
import { inRange, weekBounds } from "./dates.ts";
import { nodeLabel } from "./display.ts";
import { hydrateHistory, historyKnownSince } from "./history.ts";

export function weightOf(status: NodeStatus): number {
  if (status === "done") return 1;
  if (status === "doing") return 0.4;
  return 0;
}

export function progressOf(nodes: KnowledgeNode[]): {
  pct: number;
  done: number;
  doing: number;
  todo: number;
} {
  if (!nodes.length) return { pct: 0, done: 0, doing: 0, todo: 0 };
  let done = 0;
  let doing = 0;
  let todo = 0;
  let w = 0;
  for (const n of nodes) {
    if (n.status === "done") done += 1;
    else if (n.status === "doing") doing += 1;
    else todo += 1;
    w += weightOf(n.status);
  }
  return { pct: Math.round((w / nodes.length) * 100), done, doing, todo };
}

export function changedToThisWeek(
  node: KnowledgeNode,
  to: NodeStatus,
  start: Date,
  cap: Date,
): boolean {
  const hist = node.statusHistory || [];
  if (hist.some((h) => h.to === to && inRange(h.at, start, cap))) return true;
  if (!hist.length && node.status === to && inRange(node.statusChangedAt, start, cap)) return true;
  return false;
}

export function stallInfo(node: KnowledgeNode): { stall: boolean; unknown: boolean; days: number } {
  if (node.status !== "doing") return { stall: false, unknown: false, days: 0 };
  const t = node.statusChangedAt || node.firstSeenDoingAt;
  if (!t) return { stall: false, unknown: true, days: 0 };
  const days = (Date.now() - new Date(t).getTime()) / 86400000;
  return { stall: days >= 14, unknown: false, days };
}

export function firstDoneAt(node: KnowledgeNode): string | null {
  // The durable field survives relearning and the compact display history's trim.
  return node.firstDoneAt ?? null;
}

function logInWeek(log: PracticeLog, start: Date, cap: Date): boolean {
  return inRange(log.createdAt, start, cap);
}

export function weekSummary(source: KnowledgeTree, weekId: string) {
  const tree = hydrateHistory(source);
  const { start, cap, isFuture } = weekBounds(weekId);
  const historical = (status: NodeStatus) => {
    const nodes = new Map<string, { id: string; title: string; priority: KnowledgeNode["priority"]; exists: boolean }>();
    for (const h of tree.learningHistory!) {
      if (!isFuture && h.to === status && inRange(h.at, start, cap) && !nodes.has(h.nodeId))
        nodes.set(h.nodeId, { id: h.nodeId, title: h.title, priority: h.priority, exists: tree.nodes.some(n => n.id === h.nodeId) });
    }
    return [...nodes.values()];
  };
  const newlyDone = historical("done");
  const newlyDoing = historical("doing");
  const stalled: Array<{ node: KnowledgeNode; days: number }> = [];
  let unknownDoing = 0;
  // Diagnostics always describe today's state, independent of the selected week.
  for (const node of tree.nodes) {
    const info = stallInfo(node);
    if (info.unknown) unknownDoing += 1;
    if (info.stall) stalled.push({ node, days: info.days });
  }
  const weekLogs = isFuture ? [] : tree.logs.filter(e => logInWeek(e, start, cap));
  const p0focus = tree.nodes.filter(n => n.priority === 0 && n.status !== "done")
    .sort((a,b) => (a.status === "doing" ? 0 : 1) - (b.status === "doing" ? 0 : 1) || a.sectionId.localeCompare(b.sectionId) || a.order - b.order || a.id.localeCompare(b.id)).slice(0,8);
  return { newlyDone, newlyDoing, stalled, unknownDoing, weekLogs, p0focus, isFuture,
    historyKnown: !isFuture && historyKnownSince(tree,start) };
}

export function yearWindow(now = new Date()) {
  const y = now.getFullYear();
  const arr: Array<{ key: string; y: number; m: number; label: string }> = [];
  for (let m = 0; m < 12; m += 1) {
    arr.push({
      key: `${y}-${m + 1}`,
      y,
      m,
      label: `${m + 1}月`,
    });
  }
  return arr;
}

export function doneIncrement(tree: KnowledgeTree, y: number, m: number): number | null {
  const start = new Date(y,m,1), end = new Date(y,m+1,1);
  if (!historyKnownSince(tree,start)) return null;
  // An observed legacy completion cannot establish that it was the first one.
  if (tree.nodes.some(n => !n.firstDoneExact && n.firstDoneAt && inRange(n.firstDoneAt,start,end))) return null;
  return new Set((tree.learningHistory ?? []).filter(h => h.firstDone && inRange(h.at,start,end)).map(h => h.nodeId)).size;
}

export function buildWeekDraft(tree: KnowledgeTree, weekId: string, leakHint = ""): string {
  const s = weekSummary(tree, weekId);
  const names = (arr: Array<{ id: string; title: string }>) =>
    arr.length ? arr.map((it) => nodeLabel(it)).join("；") : "无";
  const logNames = s.weekLogs.length
    ? s.weekLogs.map((e) => e.title || "未命名记录").join("；")
    : "无";
  return [
    "【自动草稿 · 可改】",
    `所选周标为掌握 ${s.historyKnown ? s.newlyDone.length : "总数未知；已知 " + s.newlyDone.length} 条：${names(s.newlyDone)}`,
    `所选周标为在学 ${s.historyKnown ? s.newlyDoing.length : "总数未知；已知 " + s.newlyDoing.length} 条：${names(s.newlyDoing)}`,
    `当前诊断（今天）：滞留超过 14 天 ${s.stalled.length} 条：${names(s.stalled.map((x) => x.node))}`,
    `所选周创建的实践记录 ${s.weekLogs.length} 条：${logNames}`,
    `当前建议关注的 P0：${names(s.p0focus)}`,
    leakHint || "把「真正推进的一件事」收成其中最硬的一条，下周主问题只留一个问句。",
  ].join("\n");
}
