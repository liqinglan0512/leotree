import type { KnowledgeTree, Workspace } from "./types.ts";
import { SCHEMA_VERSION } from "./types.ts";

export type ValidationCode = "SCHEMA_INVALID" | "RELATION_INVALID" | "UNSUPPORTED_VERSION";
export class DataError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = "DataError"; this.code = code; }
}
export type Issue = { code: ValidationCode; path: string; message: string };
export type Validation = { valid: boolean; issues: Issue[] };
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const validId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 240 &&
  !Array.from(v).some(c => c.charCodeAt(0) < 32 || c === "/" || c === "\\") && !["__proto__", "prototype", "constructor", ".", ".."].includes(v);
const timestamp = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
const statuses = ["todo", "doing", "done"];

// Read validation never repairs a container or drops unrecognised records.
export function validateTree(value: unknown, prefix = "tree"): Validation {
  const issues: Issue[] = [];
  const issue = (path: string, message: string, relation = false) => issues.push({ code: relation ? "RELATION_INVALID" : "SCHEMA_INVALID", path: `${prefix}.${path}`, message });
  if (!isRecord(value)) return { valid: false, issues: [{ code: "SCHEMA_INVALID", path: prefix, message: "Expected tree object" }] };
  const t = value;
  if (!validId(t.id)) issue("id", "Invalid identity");
  for (const k of ["title", "description"]) if (typeof t[k] !== "string") issue(k, "Expected text");
  for (const k of ["createdAt", "updatedAt"]) if (!timestamp(t[k])) issue(k, "Invalid timestamp");
  if (t.templateId !== null && !validId(t.templateId)) issue("templateId", "Invalid template ID");
  for (const k of ["sections", "nodes", "logs"]) if (!Array.isArray(t[k])) issue(k, "Expected array; refusing to replace content with empty array");
  for (const k of ["reviews", "settings"]) if (!isRecord(t[k])) issue(k, "Expected object");
  if (issues.length) return { valid: false, issues };
  const sections = t.sections as Record<string, unknown>[];
  const nodes = t.nodes as Record<string, unknown>[];
  const logs = t.logs as Record<string, unknown>[];
  const unique = (items: unknown[], path: string) => {
    const ids = new Set<string>();
    items.forEach((v, i) => {
      if (!isRecord(v) || !validId(v.id)) issue(`${path}[${i}].id`, "Invalid identity");
      else if (ids.has(v.id)) issue(`${path}[${i}].id`, "Duplicate identity", true);
      else ids.add(v.id);
    });
    return ids;
  };
  const sectionIds = unique(sections, "sections");
  const nodeIds = unique(nodes, "nodes");
  unique(logs, "logs");
  const order = (v: unknown, path: string) => {
    if (!Number.isSafeInteger(v) || (v as number) < 0) issue(path, "Expected nonnegative integer order");
  };
  sections.forEach((s, i) => {
    if (!isRecord(s)) return;
    for (const k of ["title", "description"]) if (typeof s[k] !== "string") issue(`sections[${i}].${k}`, "Expected text");
    order(s.order, `sections[${i}].order`);
  });
  const refs = (v: unknown, path: string, optional = false) => {
    if (v === undefined && optional) return;
    if (!strings(v) || new Set(v).size !== v.length) { issue(path, "Expected unique node IDs"); return; }
    v.forEach(id => { if (!nodeIds.has(id)) issue(path, `Missing node ${id}`, true); });
  };
  const byId = new Map(nodes.filter(isRecord).map(n => [n.id, n]));
  nodes.forEach((n, i) => {
    if (!isRecord(n)) return;
    const p = `nodes[${i}]`;
    for (const k of ["title", "hint", "note"]) if (typeof n[k] !== "string") issue(`${p}.${k}`, "Expected text");
    if (!statuses.includes(n.status as string)) issue(`${p}.status`, "Invalid status");
    if (![0, 1, 2, 3].includes(n.priority as number)) issue(`${p}.priority`, "Invalid priority");
    if (!strings(n.tags)) issue(`${p}.tags`, "Expected text array");
    if (!sectionIds.has(n.sectionId as string)) issue(`${p}.sectionId`, "Missing section", true);
    order(n.order, `${p}.order`);
    for (const k of ["createdAt", "updatedAt"]) if (!timestamp(n[k])) issue(`${p}.${k}`, "Invalid timestamp");
    for (const k of ["statusChangedAt", "firstSeenDoingAt", "firstDoneAt", "historyCompleteSince"]) {
      if (n[k] !== undefined && n[k] !== null && !timestamp(n[k])) issue(`${p}.${k}`, "Invalid optional timestamp");
    }
    if (!Array.isArray(n.statusHistory) || !n.statusHistory.every(h => isRecord(h) && statuses.includes(h.from as string) && statuses.includes(h.to as string) && timestamp(h.at))) issue(`${p}.statusHistory`, "Invalid status history");
    if (n.parentId !== null && n.parentId !== undefined) {
      const parent = byId.get(n.parentId);
      if (!parent) issue(`${p}.parentId`, "Missing parent", true);
      else if (parent.sectionId !== n.sectionId) issue(`${p}.parentId`, "Parent and child must share section", true);
      if (n.parentId === n.id) issue(`${p}.parentId`, "Self parent", true);
    }
    refs(n.relatedNodeIds, `${p}.relatedNodeIds`, true);
    refs(n.prerequisiteIds, `${p}.prerequisiteIds`, true);
    if (n.attachments !== undefined) {
      if (!Array.isArray(n.attachments)) issue(`${p}.attachments`, "Expected attachments array");
      else {
        unique(n.attachments, `${p}.attachments`);
        n.attachments.forEach((a, j) => {
          if (!isRecord(a)) return;
          if (typeof a.name !== "string" || !a.name || !["png", "md", "pdf", "docx"].includes(a.kind as string) || !Number.isSafeInteger(a.size) || (a.size as number) < 0 || !timestamp(a.addedAt)) issue(`${p}.attachments[${j}]`, "Invalid attachment metadata");
        });
      }
    }
  });
  // Iterative graph colouring also handles deep trees without stack recursion.
  const done = new Set<unknown>();
  for (const start of byId.keys()) {
    const trail = new Set<unknown>();
    let id: unknown = start;
    while (id != null && byId.has(id) && !done.has(id)) {
      if (trail.has(id)) { issue("nodes.parentId", `Cycle at ${String(id)}`, true); break; }
      trail.add(id); id = byId.get(id)?.parentId;
    }
    trail.forEach(id => done.add(id));
  }
  logs.forEach((l, i) => {
    if (!isRecord(l)) return;
    const p = `logs[${i}]`;
    for (const k of ["title", "date", "question", "hypothesis", "process", "conclusion", "attachmentNote"]) if (typeof l[k] !== "string") issue(`${p}.${k}`, "Expected text");
    if (!["idea", "running", "done", "dropped"].includes(l.status as string)) issue(`${p}.status`, "Invalid log status");
    if (!isRecord(l.custom) || !strings(l.tags)) issue(p, "Invalid custom fields/tags");
    for (const k of ["createdAt", "updatedAt"]) if (!timestamp(l[k])) issue(`${p}.${k}`, "Invalid timestamp");
    refs(l.linkedNodeIds, `${p}.linkedNodeIds`);
  });
  const reviewIds = new Set<string>();
  for (const [id, r] of Object.entries(t.reviews as Record<string, unknown>)) {
    if (!isRecord(r)) { issue(`reviews.${id}`, "Expected review"); continue; }
    if (!validId(id) || id !== r.weekId || reviewIds.has(String(r.weekId))) issue(`reviews.${id}.weekId`, "Invalid or duplicate review identity", true);
    reviewIds.add(String(r.weekId));
    for (const k of ["focus", "stuck", "nextMain", "nextP2", "risk", "summary"]) if (typeof r[k] !== "string") issue(`reviews.${id}.${k}`, "Expected text");
    if (!isRecord(r.custom) || !timestamp(r.updatedAt)) issue(`reviews.${id}`, "Invalid review metadata");
  }
  return { valid: issues.length === 0, issues };
}

export function validateWorkspace(value: unknown): Validation {
  if (!isRecord(value)) return { valid: false, issues: [{ code: "SCHEMA_INVALID", path: "workspace", message: "Expected workspace" }] };
  if (value.schemaVersion !== SCHEMA_VERSION) return { valid: false, issues: [{ code: "UNSUPPORTED_VERSION", path: "schemaVersion", message: `Unsupported schema ${String(value.schemaVersion)}` }] };
  if (!isRecord(value.trees)) return { valid: false, issues: [{ code: "SCHEMA_INVALID", path: "trees", message: "Expected tree map" }] };
  const issues: Issue[] = [];
  for (const [id, t] of Object.entries(value.trees)) {
    issues.push(...validateTree(t, `trees.${id}`).issues);
    if (!isRecord(t) || id !== t.id || !validId(id)) issues.push({ code: "RELATION_INVALID", path: `trees.${id}`, message: "Tree map key must equal tree ID" });
  }
  if (value.currentTreeId !== null && (typeof value.currentTreeId !== "string" || !Object.hasOwn(value.trees, value.currentTreeId))) issues.push({ code: "RELATION_INVALID", path: "currentTreeId", message: "Selected tree does not exist" });
  if (value.workspaceRevision !== undefined && (!Number.isSafeInteger(value.workspaceRevision) || (value.workspaceRevision as number) < 0)) issues.push({ code: "SCHEMA_INVALID", path: "workspaceRevision", message: "Invalid revision" });
  return { valid: !issues.length, issues };
}

export function assertTree(value: unknown): asserts value is KnowledgeTree { assertValid(validateTree(value)); }
export function assertWorkspace(value: unknown): asserts value is Workspace { assertValid(validateWorkspace(value)); }
function assertValid(result: Validation) {
  if (!result.valid) throw new DataError(result.issues[0].code, result.issues.map(i => `${i.path}: ${i.message}`).join("\n"));
}

// Gaps and ties from old releases are repaired deterministically, never by deleting nodes.
export function normalizeOrders(tree: KnowledgeTree): KnowledgeTree {
  const compare = (a: { order: number; id: string }, b: { order: number; id: string }) => a.order - b.order || a.id.localeCompare(b.id);
  const groups = new Map<string, typeof tree.nodes>();
  for (const n of tree.nodes) {
    const key = JSON.stringify([n.sectionId, n.parentId ?? null]);
    const group = groups.get(key) ?? []; group.push(n); groups.set(key, group);
  }
  const positions = new Map<string, number>();
  for (const group of groups.values()) group.sort(compare).forEach((n, i) => positions.set(n.id, i));
  return { ...tree, sections: [...tree.sections].sort(compare).map((s, order) => ({ ...s, order })), nodes: tree.nodes.map(n => ({ ...n, order: positions.get(n.id)! })) };
}
