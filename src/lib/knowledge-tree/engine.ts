import { parseISODate, addDays, weekIdFromDate } from "./dates.ts";
import { instantiateTemplate, newBlankTree, touchTree } from "./factory.ts";
import { nowISO, uid } from "./ids.ts";
import { getTemplate } from "./templates/index.ts";
import { blankTemplate } from "./templates/blank.ts";
import { childrenOf, parentIdOf, subtreeIds, wouldCycle } from "./tree.ts";
import type { KnowledgeNode, KnowledgeTree, NodeStatus, PracticeLog, Review, Workspace } from "./types.ts";
import { assertTree, DataError, normalizeOrders } from "./validation.ts";
import { STATUS_CYCLE } from "./factory.ts";

function replaceTree(ws: Workspace, tree: KnowledgeTree): Workspace {
  assertTree(tree);
  tree = normalizeOrders(tree);
  return {
    ...ws,
    trees: { ...ws.trees, [tree.id]: touchTree(tree) },
    currentTreeId: ws.currentTreeId,
  };
}

export function currentTree(ws: Workspace): KnowledgeTree | null {
  if (!ws.currentTreeId) return null;
  return ws.trees[ws.currentTreeId] ?? null;
}

export function setCurrentTree(ws: Workspace, treeId: string): Workspace {
  if (!ws.trees[treeId]) return ws;
  return { ...ws, currentTreeId: treeId, ui: { ...ws.ui, switcherOpen: false, editing: false, focusNodeId: null } };
}

export function createTreeFromTemplate(ws: Workspace, templateId: string, title?: string): Workspace {
  const tpl = getTemplate(templateId) ?? blankTemplate;
  const tree = instantiateTemplate(tpl, { title: title ?? tpl.title });
  return {
    ...ws,
    trees: { ...ws.trees, [tree.id]: tree },
    currentTreeId: tree.id,
    ui: { ...ws.ui, switcherOpen: false, editing: tpl.id === "blank", tab: "tree", focusNodeId: null },
  };
}

export function createBlankTree(ws: Workspace, title = "未命名知识树"): Workspace {
  const tree = newBlankTree(title);
  return {
    ...ws,
    trees: { ...ws.trees, [tree.id]: tree },
    currentTreeId: tree.id,
    ui: { ...ws.ui, switcherOpen: false, editing: true, tab: "tree", focusNodeId: null },
  };
}

export function renameTree(ws: Workspace, treeId: string, title: string, description?: string): Workspace {
  const tree = ws.trees[treeId];
  if (!tree) return ws;
  return replaceTree(ws, {
    ...tree,
    title: title.trim() || tree.title,
    description: description !== undefined ? description : tree.description,
  });
}

export function duplicateTree(ws: Workspace, treeId: string): Workspace {
  const tree = ws.trees[treeId];
  if (!tree) return ws;
  const copy: KnowledgeTree = {
    ...structuredClone(tree),
    id: uid("tree"),
    title: `${tree.title} 副本`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  return {
    ...ws,
    trees: { ...ws.trees, [copy.id]: copy },
    currentTreeId: copy.id,
    ui: { ...ws.ui, switcherOpen: false },
  };
}

export function deleteTree(ws: Workspace, treeId: string): Workspace {
  const trees = { ...ws.trees };
  delete trees[treeId];
  const ids = Object.keys(trees);
  return {
    ...ws,
    trees,
    currentTreeId: ws.currentTreeId === treeId ? (ids[0] ?? null) : ws.currentTreeId,
  };
}

export function cycleNodeStatus(ws: Workspace, nodeId: string): Workspace {
  const node = currentTree(ws)?.nodes.find(n => n.id === nodeId);
  if (!node) return ws;
  return setNodeStatus(ws, nodeId, STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % 3]);
}

export function setNodeStatus(ws: Workspace, nodeId: string, to: NodeStatus): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  if (!STATUS_CYCLE.includes(to)) throw new DataError("SCHEMA_INVALID", "Invalid learning state");
  const at = nowISO();
  return replaceTree(ws, { ...tree, nodes: tree.nodes.map(n => {
    if (n.id !== nodeId || n.status === to) return n;
    return { ...n, status: to, statusChangedAt: at,
      statusHistory: [...n.statusHistory, { from: n.status, to, at }].slice(-20),
      firstSeenDoingAt: to === "doing" && !n.firstSeenDoingAt ? at : n.firstSeenDoingAt,
      updatedAt: at };
  }) });
}

export type NodeContentPatch = Partial<Pick<KnowledgeNode, "title" | "hint" | "note" | "priority" | "tags" | "relatedNodeIds" | "prerequisiteIds">>;
export function patchNode(ws: Workspace, nodeId: string, patch: NodeContentPatch): Workspace {
  const allowed = new Set(["title", "hint", "note", "priority", "tags", "relatedNodeIds", "prerequisiteIds"]);
  if (Object.keys(patch).some(k => !allowed.has(k))) throw new DataError("SCHEMA_INVALID", "Content patch cannot change identity, structure, learning history or files");
  const tree = currentTree(ws);
  if (!tree) return ws;
  return replaceTree(ws, { ...tree, nodes: tree.nodes.map(n => n.id === nodeId ? { ...n, ...patch, updatedAt: nowISO() } : n) });
}

function removeNodes(tree: KnowledgeTree, ids: Set<string>): KnowledgeTree {
  return { ...tree,
    nodes: tree.nodes.filter(n => !ids.has(n.id)).map(n => ({ ...n,
      relatedNodeIds: n.relatedNodeIds?.filter(id => !ids.has(id)),
      prerequisiteIds: n.prerequisiteIds?.filter(id => !ids.has(id)),
    })),
    logs: tree.logs.map(l => ({ ...l, linkedNodeIds: l.linkedNodeIds.filter(id => !ids.has(id)) })),
  };
}

export function addSection(ws: Workspace, title = "未命名分区"): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const section = {
    id: uid("sec"),
    title,
    description: "",
    order: tree.sections.length,
  };
  return replaceTree(ws, { ...tree, sections: [...tree.sections, section] });
}

export function patchSection(
  ws: Workspace,
  sectionId: string,
  patch: Partial<{ title: string; description: string }>,
): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  return replaceTree(ws, {
    ...tree,
    sections: tree.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
  });
}

export function moveSection(ws: Workspace, sectionId: string, dir: -1 | 1): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const sorted = [...tree.sections].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((s) => s.id === sectionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return ws;
  const tmp = sorted[i];
  sorted[i] = sorted[j];
  sorted[j] = tmp;
  return replaceTree(ws, {
    ...tree,
    sections: sorted.map((s, order) => ({ ...s, order })),
  });
}

export function deleteSection(ws: Workspace, sectionId: string): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  return replaceTree(ws, {
    ...removeNodes(tree, new Set(tree.nodes.filter(n => n.sectionId === sectionId).map(n => n.id))),
    sections: tree.sections.filter((s) => s.id !== sectionId),
  });
}

export function addNode(ws: Workspace, sectionId: string, parentId: string | null = null): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  if (!tree.sections.some(s => s.id === sectionId)) throw new DataError("RELATION_INVALID", "Missing section");
  let parent: KnowledgeNode | undefined;
  if (parentId) {
    parent = tree.nodes.find((n) => n.id === parentId);
    if (!parent) return ws;
    sectionId = parent.sectionId;
  }
  const siblings = tree.nodes.filter(
    (n) => n.sectionId === sectionId && parentIdOf(n) === (parentId ?? null),
  );
  const t = nowISO();
  const node: KnowledgeNode = {
    id: uid("node"),
    sectionId,
    title: "未命名节点",
    hint: "",
    status: "todo",
    priority: parent?.priority ?? 1,
    note: "",
    tags: [],
    order: siblings.length,
    createdAt: t,
    updatedAt: t,
    statusChangedAt: null,
    statusHistory: [],
    firstSeenDoingAt: null,
    parentId: parentId ?? null,
    prerequisiteIds: [],
    relatedNodeIds: [],
    attachments: [],
  };
  return replaceTree(ws, {
    ...tree,
    nodes: [...tree.nodes, node],
  });
}

export function deleteNode(ws: Workspace, nodeId: string): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return ws;
  const ids = new Set(subtreeIds(tree.nodes, nodeId));
  const nextFocus =
    ws.ui.focusNodeId && ids.has(ws.ui.focusNodeId) ? parentIdOf(node) : ws.ui.focusNodeId;
  const next = replaceTree(ws, {
    ...removeNodes(tree, ids),
  });
  return { ...next, ui: { ...next.ui, focusNodeId: nextFocus } };
}

export function moveNode(ws: Workspace, nodeId: string, dir: -1 | 1): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return ws;
  const siblings = childrenOf(
    tree.nodes.filter((n) => n.sectionId === node.sectionId),
    parentIdOf(node),
  );
  const i = siblings.findIndex((n) => n.id === nodeId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= siblings.length) return ws;
  const a = siblings[i];
  const b = siblings[j];
  return replaceTree(ws, {
    ...tree,
    nodes: tree.nodes.map((n) => {
      if (n.id === a.id) return { ...n, order: b.order };
      if (n.id === b.id) return { ...n, order: a.order };
      return n;
    }),
  });
}

export function moveNodeToSection(ws: Workspace, nodeId: string, sectionId: string): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  if (!tree.sections.some(s => s.id === sectionId)) throw new DataError("RELATION_INVALID", "Missing section");
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return ws;
  const ids = new Set(subtreeIds(tree.nodes, nodeId));
  const parent = node.parentId ? tree.nodes.find((n) => n.id === node.parentId) : null;
  const detach = parent ? parent.sectionId !== sectionId : false;
  const roots = tree.nodes.filter(
    (n) => n.sectionId === sectionId && parentIdOf(n) === null && !ids.has(n.id),
  );
  return replaceTree(ws, {
    ...tree,
    nodes: tree.nodes.map((n) => {
      if (!ids.has(n.id)) return n;
      if (n.id === nodeId) {
        return {
          ...n,
          sectionId,
          parentId: detach ? null : (n.parentId ?? null),
          order: detach || isRootish(n) ? roots.length : n.order,
          updatedAt: nowISO(),
        };
      }
      return { ...n, sectionId, updatedAt: nowISO() };
    }),
  });
}

function isRootish(n: KnowledgeNode): boolean {
  return parentIdOf(n) === null;
}

export function setNodeParent(ws: Workspace, nodeId: string, parentId: string | null): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return ws;
  if (wouldCycle(tree.nodes, nodeId, parentId)) return ws;
  let sectionId = node.sectionId;
  if (parentId) {
    const parent = tree.nodes.find((n) => n.id === parentId);
    if (!parent) return ws;
    sectionId = parent.sectionId;
  }
  const ids = new Set(subtreeIds(tree.nodes, nodeId));
  const siblings = tree.nodes.filter(
    (n) => n.sectionId === sectionId && parentIdOf(n) === parentId && !ids.has(n.id),
  );
  return replaceTree(ws, {
    ...tree,
    nodes: tree.nodes.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          parentId,
          sectionId,
          order: siblings.length,
          updatedAt: nowISO(),
        };
      }
      if (ids.has(n.id)) return { ...n, sectionId, updatedAt: nowISO() };
      return n;
    }),
  });
}

export function focusNode(ws: Workspace, nodeId: string | null): Workspace {
  if (nodeId) {
    const tree = currentTree(ws);
    if (!tree?.nodes.some((n) => n.id === nodeId)) return patchUi(ws, { focusNodeId: null, tab: "tree" });
  }
  return patchUi(ws, { focusNodeId: nodeId, tab: "tree" });
}

export function focusParent(ws: Workspace): Workspace {
  const tree = currentTree(ws);
  if (!tree || !ws.ui.focusNodeId) return patchUi(ws, { focusNodeId: null, tab: "tree" });
  const node = tree.nodes.find((n) => n.id === ws.ui.focusNodeId);
  return patchUi(ws, { focusNodeId: node ? parentIdOf(node) : null, tab: "tree" });
}

export function patchReview(ws: Workspace, weekId: string, patch: Partial<Review>): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const prev = tree.reviews[weekId] ?? {
    weekId,
    focus: "",
    stuck: "",
    nextMain: "",
    nextP2: "",
    risk: "",
    summary: "",
    custom: {},
    updatedAt: nowISO(),
  };
  const next: Review = {
    ...prev,
    ...patch,
    custom: { ...prev.custom, ...(patch.custom || {}) },
    weekId,
    updatedAt: nowISO(),
  };
  return replaceTree(ws, { ...tree, reviews: { ...tree.reviews, [weekId]: next } });
}

export function addLog(ws: Workspace, partial: Partial<PracticeLog> = {}): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const log: PracticeLog = {
    id: uid("log"),
    title: "",
    date: new Date().toISOString().slice(0, 10),
    status: "idea",
    question: "",
    hypothesis: "",
    process: "",
    conclusion: "",
    linkedNodeIds: [],
    attachmentNote: "",
    tags: [],
    custom: {},
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
  return {
    ...replaceTree(ws, { ...tree, logs: [log, ...tree.logs] }),
    ui: { ...ws.ui, tab: "log", expandedLogs: { ...ws.ui.expandedLogs, [log.id]: true }, scrollLogId: log.id },
  };
}

export function patchLog(ws: Workspace, logId: string, patch: Partial<PracticeLog>): Workspace {
  if ("id" in patch || "createdAt" in patch) throw new DataError("SCHEMA_INVALID", "Log identity is immutable");
  const tree = currentTree(ws);
  if (!tree) return ws;
  return replaceTree(ws, {
    ...tree,
    logs: tree.logs.map((l) =>
      l.id === logId
        ? { ...l, ...patch, custom: { ...l.custom, ...(patch.custom || {}) }, updatedAt: nowISO() }
        : l,
    ),
  });
}

export function deleteLog(ws: Workspace, logId: string): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  const expanded = { ...ws.ui.expandedLogs };
  delete expanded[logId];
  return {
    ...replaceTree(ws, { ...tree, logs: tree.logs.filter((l) => l.id !== logId) }),
    ui: { ...ws.ui, expandedLogs: expanded },
  };
}

export function shiftWeek(ws: Workspace, dir: -1 | 1): Workspace {
  const cur = ws.ui.weekId || weekIdFromDate();
  const next = weekIdFromDate(addDays(parseISODate(cur), dir * 7));
  return { ...ws, ui: { ...ws.ui, weekId: next } };
}

export function patchUi(ws: Workspace, patch: Partial<Workspace["ui"]>): Workspace {
  return { ...ws, ui: { ...ws.ui, ...patch } };
}

export function resetCurrentTreeProgress(ws: Workspace): Workspace {
  const tree = currentTree(ws);
  if (!tree) return ws;
  return replaceTree(ws, {
    ...tree,
    nodes: tree.nodes.map((n) => ({
      ...n,
      status: "todo" as const,
      statusChangedAt: null,
      statusHistory: [],
      firstSeenDoingAt: null,
    })),
  });
}
