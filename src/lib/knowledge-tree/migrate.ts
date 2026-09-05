import { weekIdFromDate } from "./dates.ts";
import { emptyUi, emptyWorkspace, instantiateTemplate } from "./factory.ts";
import { nowISO } from "./ids.ts";
import { snnTemplate } from "./templates/snn.ts";
import type {
  KnowledgeNode,
  KnowledgeTree,
  LogStatus,
  NodeStatus,
  PracticeLog,
  Review,
  Workspace,
  WorkspaceUi,
} from "./types.ts";
import { SCHEMA_VERSION } from "./types.ts";

export function normalizeStatus(s: unknown): NodeStatus {
  const x = String(s ?? "todo").toLowerCase();
  if (["done", "mastered", "✓", "掌握"].includes(x) || s === "✓") return "done";
  if (["doing", "learning", "△", "在学", "正在学"].includes(x) || s === "△") return "doing";
  if (["todo", "none", "□", "未学", "idle"].includes(x) || s === "□") return "todo";
  if (x === "done" || x === "doing" || x === "todo") return x;
  return "todo";
}

function mergeUnknown(base: Record<string, unknown>, extra: Record<string, unknown>) {
  for (const [k, v] of Object.entries(extra)) {
    if (!(k in base) && v !== undefined) base[k] = v;
  }
  return base;
}

export function isWorkspaceV3(raw: unknown): raw is Workspace {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return o.schemaVersion === 3 && o.trees !== undefined && typeof o.trees === "object";
}

function lookLikeV2(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion === 3) return false;
  if (o.tree && typeof o.tree === "object") return true;
  if (o.experiments || o.weeklyReviews) return true;
  const keys = Object.keys(o);
  return keys.some((k) => /^[A-F]\d{2}$/.test(k));
}

function extractV2TreeMap(raw: Record<string, unknown>): Record<string, Record<string, unknown>> {
  if (raw.tree && typeof raw.tree === "object" && !Array.isArray(raw.tree)) {
    return raw.tree as Record<string, Record<string, unknown>>;
  }
  if (raw.items && typeof raw.items === "object") {
    return raw.items as Record<string, Record<string, unknown>>;
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "schemaVersion" || k === "weeklyReviews" || k === "experiments" || k === "ui") continue;
    if (v && typeof v === "object" && !Array.isArray(v) && ("status" in (v as object) || "note" in (v as object))) {
      out[k] = v as Record<string, unknown>;
    }
  }
  return out;
}

function overlayNodeProgress(tree: KnowledgeTree, map: Record<string, Record<string, unknown>>): KnowledgeTree {
  const now = nowISO();
  const nodes = tree.nodes.map((n) => {
    const v = map[n.id];
    if (!v) return n;
    const status = normalizeStatus(v.status);
    const next: KnowledgeNode = {
      ...n,
      status,
      note: String(v.note ?? n.note ?? ""),
      statusChangedAt: (v.statusChangedAt as string) || null,
      statusHistory: Array.isArray(v.statusHistory) ? (v.statusHistory as KnowledgeNode["statusHistory"]).slice(-20) : [],
      firstSeenDoingAt: (v.firstSeenDoingAt as string) || null,
    };
    if (next.status === "doing" && !next.statusChangedAt && !next.firstSeenDoingAt) {
      next.firstSeenDoingAt = now;
    }
    mergeUnknown(next as unknown as Record<string, unknown>, v);
    return next;
  });
  return { ...tree, nodes };
}

function mapV2Review(weekId: string, raw: Record<string, unknown>): Review {
  const r: Review = {
    weekId,
    focus: String(raw.focus ?? ""),
    stuck: String(raw.stuck ?? ""),
    nextMain: String(raw.nextMain ?? ""),
    nextP2: String(raw.nextP2 ?? ""),
    risk: "",
    summary: String(raw.draft ?? raw.summary ?? ""),
    custom: {
      leak: raw.leak ?? "no",
      leakNote: raw.leakNote ?? "",
    },
    updatedAt: nowISO(),
  };
  mergeUnknown(r as unknown as Record<string, unknown>, raw);
  return r;
}

function mapV2Log(raw: Record<string, unknown>): PracticeLog {
  const statusMap: Record<string, LogStatus> = {
    idea: "idea",
    running: "running",
    done: "done",
    dropped: "dropped",
  };
  const log: PracticeLog = {
    id: String(raw.id ?? `log-${Math.random().toString(36).slice(2)}`),
    title: String(raw.title ?? ""),
    date: String(raw.date ?? ""),
    status: statusMap[String(raw.status)] ?? "idea",
    question: "",
    hypothesis: String(raw.hypothesis ?? ""),
    process: String(raw.falsify ?? ""),
    conclusion: String(raw.verdictNote ?? raw.conclusion ?? ""),
    linkedNodeIds: Array.isArray(raw.linkedIds) ? (raw.linkedIds as string[]) : Array.isArray(raw.linkedNodeIds) ? (raw.linkedNodeIds as string[]) : [],
    attachmentNote: String(raw.attachmentNote ?? ""),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    custom: {
      falsify: raw.falsify ?? "",
      models: raw.models ?? [],
      readouts: raw.readouts ?? [],
      T: raw.T ?? "",
      dt: raw.dt ?? "",
      dataset: raw.dataset ?? "",
      calibrator: raw.calibrator ?? "",
      calibSource: raw.calibSource ?? "",
      noTestLeak: Boolean(raw.noTestLeak),
      seeds: raw.seeds ?? "",
      acc: raw.acc ?? "",
      nll: raw.nll ?? "",
      brier: raw.brier ?? "",
      ece: raw.ece ?? "",
      temporalNote: raw.temporalNote ?? "",
      verdict: raw.verdict ?? "",
      verdictNote: raw.verdictNote ?? "",
    },
    createdAt: String(raw.createdAt ?? nowISO()),
    updatedAt: String(raw.updatedAt ?? nowISO()),
  };
  mergeUnknown(log as unknown as Record<string, unknown>, raw);
  return log;
}

export function migrateV2ToTree(raw: Record<string, unknown>, treeId = "snn-migrated"): KnowledgeTree {
  const tree = instantiateTemplate(snnTemplate, {
    treeId,
    title: "SNN",
    description: snnTemplate.description,
  });
  const map = extractV2TreeMap(raw);
  const withProgress = overlayNodeProgress(tree, map);
  const reviews: Record<string, Review> = {};
  if (raw.weeklyReviews && typeof raw.weeklyReviews === "object") {
    for (const [id, v] of Object.entries(raw.weeklyReviews as Record<string, Record<string, unknown>>)) {
      if (v && typeof v === "object") reviews[id] = mapV2Review(id, v);
    }
  }
  const logs: PracticeLog[] = Array.isArray(raw.experiments)
    ? (raw.experiments as Record<string, unknown>[]).map(mapV2Log)
    : [];
  return { ...withProgress, reviews, logs };
}

function hydrateUi(raw: unknown): WorkspaceUi {
  const base = emptyUi();
  if (!raw || typeof raw !== "object") return base;
  const u = raw as Partial<WorkspaceUi> & { tab?: string };
  const tabMap: Record<string, WorkspaceUi["tab"]> = {
    tree: "tree",
    week: "week",
    review: "week",
    log: "log",
    lab: "log",
    logs: "log",
  };
  const tab = tabMap[String(u.tab || "")] ?? "tree";
  const outlineOpen =
    u.outlineOpen && typeof u.outlineOpen === "object" && !Array.isArray(u.outlineOpen)
      ? (u.outlineOpen as Record<string, boolean>)
      : {};
  return {
    ...base,
    ...u,
    tab,
    weekId: u.weekId || weekIdFromDate(),
    focusNodeId: typeof u.focusNodeId === "string" && u.focusNodeId ? u.focusNodeId : null,
    outlineOpen,
  };
}

export function coerceTree(raw: KnowledgeTree, fallbackId: string): KnowledgeTree {
  const id = raw.id || fallbackId;
  return {
    ...raw,
    id,
    title: raw.title || "未命名知识树",
    description: raw.description || "",
    createdAt: raw.createdAt || nowISO(),
    updatedAt: raw.updatedAt || nowISO(),
    templateId: raw.templateId ?? null,
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
    reviews: raw.reviews && typeof raw.reviews === "object" ? raw.reviews : {},
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    settings: raw.settings && typeof raw.settings === "object" ? raw.settings : {},
  };
}

export function migrateToV3(raw: unknown): Workspace {
  if (!raw) return emptyWorkspace();
  if (isWorkspaceV3(raw)) {
    const ws = raw;
    const trees: Record<string, KnowledgeTree> = {};
    for (const [id, tree] of Object.entries(ws.trees ?? {})) {
      trees[id] = coerceTree(tree, id);
    }
    return {
      ...emptyWorkspace(),
      ...ws,
      schemaVersion: SCHEMA_VERSION,
      trees,
      currentTreeId: ws.currentTreeId && trees[ws.currentTreeId] ? ws.currentTreeId : Object.keys(trees)[0] ?? null,
      ui: hydrateUi(ws.ui),
    };
  }
  if (typeof raw === "object" && lookLikeV2(raw)) {
    const tree = migrateV2ToTree(raw as Record<string, unknown>);
    return {
      schemaVersion: SCHEMA_VERSION,
      currentTreeId: tree.id,
      trees: { [tree.id]: tree },
      ui: hydrateUi((raw as { ui?: unknown }).ui),
    };
  }
  return emptyWorkspace();
}

export function mergeWorkspaces(base: Workspace, incoming: unknown): Workspace {
  const add = migrateToV3(incoming);
  const trees = { ...base.trees };
  for (const [id, tree] of Object.entries(add.trees)) {
    if (!trees[id]) {
      trees[id] = tree;
      continue;
    }
    const old = trees[id];
    trees[id] = {
      ...old,
      ...tree,
      sections: tree.sections?.length ? tree.sections : old.sections,
      nodes: mergeNodes(old.nodes, tree.nodes),
      reviews: { ...old.reviews, ...tree.reviews },
      logs: mergeLogs(old.logs, tree.logs),
      settings: { ...old.settings, ...tree.settings },
    };
  }
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(add).filter(([k]) => !["schemaVersion", "trees", "currentTreeId", "ui"].includes(k)),
    ),
    schemaVersion: SCHEMA_VERSION,
    trees,
    currentTreeId: add.currentTreeId && trees[add.currentTreeId] ? add.currentTreeId : base.currentTreeId,
  };
}

function mergeNodes(oldNodes: KnowledgeNode[], incoming: KnowledgeNode[]): KnowledgeNode[] {
  const map = new Map(oldNodes.map((n) => [n.id, n]));
  for (const n of incoming) {
    const prev = map.get(n.id);
    map.set(n.id, prev ? { ...prev, ...n } : n);
  }
  return Array.from(map.values());
}

function mergeLogs(oldLogs: PracticeLog[], incoming: PracticeLog[]): PracticeLog[] {
  const map = new Map(oldLogs.map((n) => [n.id, n]));
  for (const n of incoming) {
    const prev = map.get(n.id);
    map.set(n.id, prev ? { ...prev, ...n, custom: { ...prev.custom, ...n.custom } } : n);
  }
  return Array.from(map.values());
}

export function mergeTreeIntoWorkspace(ws: Workspace, incoming: unknown): Workspace {
  if (isWorkspaceV3(incoming)) return mergeWorkspaces(ws, incoming);
  if (incoming && typeof incoming === "object") {
    const obj = incoming as Record<string, unknown>;
    const nested = obj.tree;
    const candidate = (nested && typeof nested === "object" ? nested : obj) as KnowledgeTree;
    if (Array.isArray(candidate.nodes) && Array.isArray(candidate.sections)) {
      const id = candidate.id || `tree-${Date.now().toString(36)}`;
      const prev = ws.trees[id];
      const incomingTree = coerceTree(candidate, id);
      const merged: KnowledgeTree = prev
        ? {
            ...prev,
            ...incomingTree,
            id,
            reviews: { ...prev.reviews, ...(incomingTree.reviews || {}) },
            logs: mergeLogs(prev.logs, incomingTree.logs || []),
            nodes: mergeNodes(prev.nodes, incomingTree.nodes),
            settings: { ...prev.settings, ...(incomingTree.settings || {}) },
          }
        : incomingTree;
      return {
        ...ws,
        trees: { ...ws.trees, [id]: merged },
        currentTreeId: id,
      };
    }
  }
  if (lookLikeV2(incoming)) {
    const tree = migrateV2ToTree(incoming as Record<string, unknown>, `snn-import-${Date.now().toString(36)}`);
    return {
      ...ws,
      trees: { ...ws.trees, [tree.id]: tree },
      currentTreeId: tree.id,
    };
  }
  return ws;
}
