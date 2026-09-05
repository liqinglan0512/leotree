import { weekIdFromDate } from "./dates.ts";
import { emptyUi, emptyWorkspace, instantiateTemplate } from "./factory.ts";
import { assertTree, assertWorkspace, DataError, isRecord, normalizeOrders } from "./validation.ts";
import { uid } from "./ids.ts";
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
import { hydrateHistory } from "./history.ts";
const LEGACY_UNKNOWN_DATE = "1970-01-01T00:00:00.000Z";

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
  return o.schemaVersion === 3 && isRecord(o.trees);
}

function lookLikeV2(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== undefined && ![1, 2].includes(o.schemaVersion as number)) return false;
  if (isRecord(o.tree) || isRecord(o.items)) return true;
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
  const nodes = tree.nodes.map((n) => {
    const v = map[n.id];
    if (!v) return n;
    const status = normalizeStatus(v.status);
    const next: KnowledgeNode = {
      ...n,
      status,
      note: String(v.note ?? n.note ?? ""),
      statusChangedAt: (v.statusChangedAt as string) || null,
      statusHistory: Array.isArray(v.statusHistory) ? (v.statusHistory as KnowledgeNode["statusHistory"]) : [],
      firstSeenDoingAt: (v.firstSeenDoingAt as string) || null,
    };
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
    updatedAt: LEGACY_UNKNOWN_DATE,
  };
  mergeUnknown(r as unknown as Record<string, unknown>, raw);
  return r;
}

function mapV2Log(raw: Record<string, unknown>, index: number): PracticeLog {
  const statusMap: Record<string, LogStatus> = {
    idea: "idea",
    running: "running",
    done: "done",
    dropped: "dropped",
  };
  const log: PracticeLog = {
    id: String(raw.id ?? `legacy-log-${index}`),
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
    createdAt: String(raw.createdAt ?? LEGACY_UNKNOWN_DATE),
    updatedAt: String(raw.updatedAt ?? LEGACY_UNKNOWN_DATE),
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
  tree.createdAt = tree.updatedAt = LEGACY_UNKNOWN_DATE;
  tree.nodes = tree.nodes.map(n => ({ ...n, createdAt: LEGACY_UNKNOWN_DATE, updatedAt: LEGACY_UNKNOWN_DATE, firstDoneExact: false }));
  delete tree.learningHistory; delete tree.historyComplete; delete tree.historyCompleteSince;
  const map = extractV2TreeMap(raw);
  if (raw.tree !== undefined && !isRecord(raw.tree)) throw new DataError("SCHEMA_INVALID", "Legacy tree must be an object");
  if (raw.experiments !== undefined && !Array.isArray(raw.experiments)) throw new DataError("SCHEMA_INVALID", "Legacy experiments must be an array");
  if (raw.weeklyReviews !== undefined && !isRecord(raw.weeklyReviews)) throw new DataError("SCHEMA_INVALID", "Legacy reviews must be an object");
  if (Object.values(map).some(v => !isRecord(v))) throw new DataError("SCHEMA_INVALID", "Invalid legacy node");
  const known = new Set(tree.nodes.map(n => n.id));
  const extraIds = Object.keys(map).filter(id => !known.has(id));
  if (extraIds.length) {
    tree.sections.push({ id: "legacy-unmapped", title: "旧版自定义节点", description: "迁移保留", order: tree.sections.length });
    for (const [order, id] of extraIds.entries()) tree.nodes.push({
      ...tree.nodes[0], id, sectionId: "legacy-unmapped", order, title: String(map[id].title ?? id), hint: "", parentId: null,
      attachments: [], relatedNodeIds: [], prerequisiteIds: [], statusHistory: [],
    });
  }
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
  const result = { ...withProgress, reviews, logs, settings: { ...withProgress.settings, legacySource: structuredClone(raw) } };
  assertTree(result);
  return normalizeOrders(hydrateHistory(result));
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
  if (!isRecord(raw) || !Array.isArray(raw.sections) || !Array.isArray(raw.nodes)) throw new DataError("SCHEMA_INVALID", "Tree needs sections and nodes arrays");
  const tree = {
    ...raw, id: raw.id === undefined ? fallbackId : raw.id,
    title: raw.title ?? "未命名知识树", description: raw.description ?? "",
    createdAt: raw.createdAt ?? LEGACY_UNKNOWN_DATE, updatedAt: raw.updatedAt ?? LEGACY_UNKNOWN_DATE,
    templateId: raw.templateId ?? null, reviews: raw.reviews === undefined ? {} : raw.reviews, logs: raw.logs === undefined ? [] : raw.logs, settings: raw.settings === undefined ? {} : raw.settings,
  };
  assertTree(tree);
  return normalizeOrders(hydrateHistory(tree));
}

export function migrateToV3(raw: unknown): Workspace {
  if (!isRecord(raw)) throw new DataError("SCHEMA_INVALID", "Expected a workspace object");
  if (raw.schemaVersion !== undefined && ![1, 2, 3].includes(raw.schemaVersion as number)) throw new DataError("UNSUPPORTED_VERSION", `Unsupported schema ${String(raw.schemaVersion)}`);
  if (raw.schemaVersion === SCHEMA_VERSION) {
    assertWorkspace(raw);
    return { ...raw, ui: hydrateUi(raw.ui), trees: Object.fromEntries(Object.entries(raw.trees).map(([id,t]) => [id, normalizeOrders(hydrateHistory(t))])) };
  }
  if (lookLikeV2(raw)) {
    const tree = migrateV2ToTree(raw);
    const ws = { ...emptyWorkspace(), currentTreeId: tree.id, trees: { [tree.id]: tree }, ui: hydrateUi(raw.ui) };
    assertWorkspace(ws); return ws;
  }
  throw new DataError("SCHEMA_INVALID", "Unrecognised knowledge data; no empty replacement created");
}

/** Parse candidates without writing. Full workspaces and a single exported tree are supported. */
export function parseImport(raw: unknown): KnowledgeTree[] {
  if (!isRecord(raw)) throw new DataError("SCHEMA_INVALID", "Expected JSON knowledge data");
  if (raw.schemaVersion !== undefined && ![1,2,3].includes(raw.schemaVersion as number)) throw new DataError("UNSUPPORTED_VERSION", "Unsupported import schema");
  if ("trees" in raw) return Object.values(migrateToV3(raw).trees);
  if (Array.isArray(raw.nodes) || (isRecord(raw.tree) && ("nodes" in raw.tree || "sections" in raw.tree))) {
    const candidate = (isRecord(raw.tree) ? raw.tree : raw) as unknown as KnowledgeTree;
    return [coerceTree(candidate, uid("tree"))];
  }
  return Object.values(migrateToV3(raw).trees);
}

/** Compatibility entry points now default to independent import; replacement requires the import service. */
export function mergeTreeIntoWorkspace(ws: Workspace, incoming: unknown): Workspace {
  const trees = { ...ws.trees }; let currentTreeId = ws.currentTreeId;
  for (const source of parseImport(incoming)) {
    if (source.nodes.some(n => n.attachments?.length)) throw new DataError("ATTACHMENTS_REQUIRED", "Import file bytes through the import service");
    const tree = { ...structuredClone(source), id: uid("tree") };
    trees[tree.id] = tree; currentTreeId = tree.id;
  }
  const next = { ...ws, trees, currentTreeId }; assertWorkspace(next); return next;
}
export const mergeWorkspaces = mergeTreeIntoWorkspace;
