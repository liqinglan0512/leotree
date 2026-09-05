import * as engine from "./engine.ts";
import type { KnowledgeTree, Workspace } from "./types.ts";
import { assertWorkspace, DataError } from "./validation.ts";

export const operations = {
  createBlankTree: engine.createBlankTree, createTreeFromTemplate: engine.createTreeFromTemplate,
  renameTree: engine.renameTree, deleteTree: engine.deleteTree, duplicateTree: engine.duplicateTree,
  patchNode: engine.patchNode, cycleNodeStatus: engine.cycleNodeStatus, setNodeStatus: engine.setNodeStatus,
  addNode: engine.addNode, deleteNode: engine.deleteNode, moveNode: engine.moveNode,
  moveNodeToSection: engine.moveNodeToSection, setNodeParent: engine.setNodeParent,
  addSection: engine.addSection, patchSection: engine.patchSection, deleteSection: engine.deleteSection, moveSection: engine.moveSection,
  addLog: engine.addLog, patchLog: engine.patchLog, deleteLog: engine.deleteLog,
  patchReview: engine.patchReview, resetCurrentTreeProgress: engine.resetCurrentTreeProgress,
};
export const uiOperations = { patchUi: engine.patchUi, focusNode: engine.focusNode, focusParent: engine.focusParent, shiftWeek: engine.shiftWeek, setCurrentTree: engine.setCurrentTree };
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
type Calls<T extends Record<string, (...args: any[]) => Workspace>> = { [K in keyof T]: [K, ...Tail<Parameters<T[K]>>] }[keyof T];
export type Invocation = Calls<typeof operations>;
export type UiInvocation = Calls<typeof uiOperations>;
export type Commit = (...call: Invocation | UiInvocation) => void;
export interface Operation {
  name: keyof typeof operations;
  args: unknown[];
  treeId: string | null;
  baseRevision: number;
  at: string;
  expected: unknown;
  created?: KnowledgeTree | KnowledgeTree["nodes"][number] | KnowledgeTree["sections"][number] | KnowledgeTree["logs"][number];
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function patchExpectation(entity: Record<string,unknown> | undefined, patch: unknown): unknown {
  if (!entity) return null;
  return Object.fromEntries(Object.entries(patch as object).map(([k,v]) => [k, k === "custom" ? patchExpectation((entity.custom ?? {}) as Record<string,unknown>, v) : entity[k]]));
}
function expectation(ws: Workspace, op: Operation): unknown {
  const t = op.treeId ? ws.trees[op.treeId] : null;
  const [id, patch] = op.args;
  if (op.name.startsWith("create")) return null;
  if (op.name === "renameTree") return patchExpectation(ws.trees[id as string], { title: true, ...(op.args[2] !== undefined ? { description: true } : {}) });
  if (op.name === "deleteTree" || op.name === "duplicateTree") return ws.trees[id as string] ?? null;
  if (!t) return null;
  if (op.name === "patchNode") return patchExpectation(t.nodes.find(n => n.id === id), patch);
  if (op.name === "patchLog") return patchExpectation(t.logs.find(n => n.id === id), patch);
  if (op.name === "patchSection") return patchExpectation(t.sections.find(n => n.id === id), patch);
  if (op.name === "patchReview") return patchExpectation(t.reviews[id as string] ?? {}, patch);
  if (op.name === "cycleNodeStatus" || op.name === "setNodeStatus") return t.nodes.find(n => n.id === id)?.status ?? null;
  if (op.name === "addNode") return { section: t.sections.some(s => s.id === id), parent: op.args[1] ? t.nodes.find(n => n.id === op.args[1])?.sectionId ?? null : null };
  if (op.name === "addSection" || op.name === "addLog") return { treeId: t.id };
  // Destructive/structural changes conflict with unseen content edits instead of deleting them.
  return t;
}
export function prepareOperation(snapshot: Workspace, call: Invocation): Operation {
  const [name, ...args] = call;
  const op: Operation = { name, args: structuredClone(args), treeId: snapshot.currentTreeId, baseRevision: Number(snapshot.workspaceRevision ?? 0), at: new Date().toISOString(), expected: null };
  op.expected = structuredClone(expectation(snapshot, op));
  const next = invoke(snapshot, op);
  if (name.startsWith("create") || name === "duplicateTree") op.created = next.trees[next.currentTreeId!];
  if (name === "addNode") op.created = next.trees[op.treeId!].nodes.find(n => !snapshot.trees[op.treeId!].nodes.some(x => x.id === n.id));
  if (name === "addSection") op.created = next.trees[op.treeId!].sections.find(n => !snapshot.trees[op.treeId!].sections.some(x => x.id === n.id));
  if (name === "addLog") op.created = next.trees[op.treeId!].logs.find(n => !snapshot.trees[op.treeId!].logs.some(x => x.id === n.id));
  return op;
}
function invoke(ws: Workspace, op: Operation): Workspace {
  const fn = operations[op.name] as (ws: Workspace, ...args: any[]) => Workspace;
  const next = fn({ ...ws, currentTreeId: op.treeId }, ...op.args);
  for (const [id, tree] of Object.entries(next.trees)) {
    const before = ws.trees[id]; if (!before || before === tree) continue;
    next.trees[id] = { ...tree, updatedAt: op.at, nodes: tree.nodes.map(n => {
      const old = before.nodes.find(x => x.id === n.id);
      if (!old || old.updatedAt === n.updatedAt) return n;
      return { ...n, updatedAt: op.at,
        statusChangedAt: n.statusChangedAt !== old.statusChangedAt ? op.at : n.statusChangedAt,
        firstSeenDoingAt: n.firstSeenDoingAt && !old.firstSeenDoingAt ? op.at : n.firstSeenDoingAt,
        statusHistory: n.statusHistory.length && n.statusHistory !== old.statusHistory ? n.statusHistory.map((h,i) => i === n.statusHistory.length - 1 ? { ...h, at: op.at } : h) : n.statusHistory,
      };
    }), logs: tree.logs.map(l => { const old = before.logs.find(x => x.id === l.id); return old && old.updatedAt !== l.updatedAt ? { ...l, updatedAt: op.at } : l; }),
    reviews: Object.fromEntries(Object.entries(tree.reviews).map(([k,r]) => [k, r !== before.reviews[k] ? { ...r, updatedAt: op.at } : r])) };
  }
  return next;
}
export function applyOperation(latest: Workspace, op: Operation): Workspace {
  if (!same(expectation(latest, op), op.expected)) throw new DataError("CONFLICT", `The target of ${op.name} changed in another operation. Your draft is retained.`);
  if (!op.name.startsWith("create") && !["deleteTree", "renameTree", "duplicateTree"].includes(op.name) && (!op.treeId || !latest.trees[op.treeId])) throw new DataError("CONFLICT", "The target tree was deleted");
  let next: Workspace;
  if (op.created) {
    if (op.name.startsWith("create") || op.name === "duplicateTree") {
      const tree = op.created as KnowledgeTree;
      if (Object.hasOwn(latest.trees, tree.id)) throw new DataError("CONFLICT", "Tree ID already exists");
      next = { ...latest, trees: { ...latest.trees, [tree.id]: tree }, currentTreeId: tree.id, ui: { ...latest.ui, switcherOpen: false, focusNodeId: null, tab: "tree" } };
    } else {
      const tree = latest.trees[op.treeId!];
      const key = op.name === "addNode" ? "nodes" : op.name === "addSection" ? "sections" : "logs";
      const item = structuredClone(op.created);
      if (key === "nodes") {
        const n = item as KnowledgeTree["nodes"][number];
        n.order = tree.nodes.filter(x => x.sectionId === n.sectionId && (x.parentId ?? null) === (n.parentId ?? null)).length;
      } else if (key === "sections") (item as KnowledgeTree["sections"][number]).order = tree.sections.length;
      next = { ...latest, trees: { ...latest.trees, [tree.id]: { ...tree, [key]: [...tree[key], item], updatedAt: op.at } } };
      if (key === "logs") next.ui = { ...latest.ui, tab: "log", expandedLogs: { ...latest.ui.expandedLogs, [item.id]: true }, scrollLogId: item.id };
    }
  } else next = invoke(latest, op);
  assertWorkspace(next); return next;
}
