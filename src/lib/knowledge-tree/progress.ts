import type { KnowledgeNode, KnowledgeTree, NodeStatus, PracticeLog } from "./types.ts";
import { inRange, parseISODate, weekBounds } from "./dates.ts";
import { nodeLabel } from "./display.ts";

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
  const hit = (node.statusHistory || []).find((h) => h.to === "done");
  if (hit?.at) return hit.at;
  if (node.status === "done" && node.statusChangedAt) return node.statusChangedAt;
  return null;
}

function logInWeek(log: PracticeLog, start: Date, cap: Date): boolean {
  if (inRange(log.createdAt, start, cap) || inRange(log.updatedAt, start, cap)) return true;
  if (!log.date) return false;
  const d = parseISODate(log.date);
  d.setHours(12, 0, 0, 0);
  return d.getTime() >= start.getTime() && d.getTime() < cap.getTime();
}

export function weekSummary(tree: KnowledgeTree, weekId: string) {
  const { start, cap, isFuture } = weekBounds(weekId);
  const newlyDone: KnowledgeNode[] = [];
  const newlyDoing: KnowledgeNode[] = [];
  const stalled: Array<{ node: KnowledgeNode; days: number }> = [];
  let unknownDoing = 0;
  if (!isFuture) {
    for (const node of tree.nodes) {
      if (changedToThisWeek(node, "done", start, cap)) newlyDone.push(node);
      if (changedToThisWeek(node, "doing", start, cap)) newlyDoing.push(node);
      const info = stallInfo(node);
      if (info.unknown) unknownDoing += 1;
      if (info.stall) stalled.push({ node, days: info.days });
    }
  }
  const weekLogs: PracticeLog[] = isFuture ? [] : tree.logs.filter((e) => logInWeek(e, start, cap));
  const p0focus = tree.nodes
    .filter((n) => n.priority === 0 && n.status !== "done")
    .sort((a, b) => {
      const sa = a.status === "doing" ? 0 : 1;
      const sb = b.status === "doing" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const sec = a.sectionId.localeCompare(b.sectionId);
      if (sec !== 0) return sec;
      return a.order - b.order || a.id.localeCompare(b.id);
    })
    .slice(0, 8);
  return { newlyDone, newlyDoing, stalled, unknownDoing, weekLogs, p0focus, isFuture };
}

export function monthWindow(now = new Date()) {
  const arr: Array<{ key: string; y: number; m: number; label: string }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({
      key: `M${6 - i}`,
      y: d.getFullYear(),
      m: d.getMonth(),
      label: `${d.getMonth() + 1}月`,
    });
  }
  return arr;
}

export function doneIncrement(tree: KnowledgeTree, y: number, m: number): number {
  let n = 0;
  for (const node of tree.nodes) {
    const at = firstDoneAt(node);
    if (!at) continue;
    const d = new Date(at);
    if (d.getFullYear() === y && d.getMonth() === m) n += 1;
  }
  return n;
}

export function buildWeekDraft(tree: KnowledgeTree, weekId: string, leakHint = ""): string {
  const s = weekSummary(tree, weekId);
  const names = (arr: KnowledgeNode[]) =>
    arr.length ? arr.map((it) => nodeLabel(it)).join("；") : "无";
  const logNames = s.weekLogs.length
    ? s.weekLogs.map((e) => e.title || "未命名记录").join("；")
    : "无";
  return [
    "【自动草稿 · 可改】",
    `本周新掌握 ${s.newlyDone.length} 条：${names(s.newlyDone)}`,
    `本周新标在学 ${s.newlyDoing.length} 条：${names(s.newlyDoing)}`,
    `滞留超过 14 天 ${s.stalled.length} 条：${names(s.stalled.map((x) => x.node))}`,
    `本周实践日志 ${s.weekLogs.length} 条：${logNames}`,
    `建议只盯的 P0：${names(s.p0focus)}`,
    leakHint || "把「真正推进的一件事」收成其中最硬的一条，下周主问题只留一个问句。",
  ].join("\n");
}
