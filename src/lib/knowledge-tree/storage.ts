import { emptyUi, emptyWorkspace } from "./factory.ts";
import { migrateToV3 } from "./migrate.ts";
import type { Workspace } from "./types.ts";
import { SCHEMA_VERSION, STORAGE_KEY_V3, STORAGE_KEYS_V2 } from "./types.ts";
import { assertWorkspace, DataError, isRecord } from "./validation.ts";

export const ACTIVE_KEY = "leo-tree-workspace-v1";
export const SAFE_KEY = "leo-tree-workspace-last-good-v1";
export const RAW_PREFIX = "leo-tree-recovery-source-";
export interface StorageAdapter { read(key: string): string | null; write(key: string, value: string): void; remove(key: string): void; }
export function localStorageAdapter(): StorageAdapter {
  return { read: k => localStorage.getItem(k), write: (k,v) => localStorage.setItem(k,v), remove: k => localStorage.removeItem(k) };
}
export function memoryAdapter(seed: Record<string,string> = {}): StorageAdapter {
  const map = new Map(Object.entries(seed));
  return { read: k => map.get(k) ?? null, write: (k,v) => { map.set(k,v); }, remove: k => { map.delete(k); } };
}
export type ReadCode = "MISSING" | "READY" | "PARSE_ERROR" | "UNSUPPORTED_VERSION" | "SCHEMA_INVALID" | "RELATION_INVALID" | "STORAGE_ERROR";
export interface ReadResult { code: ReadCode; key: string; raw: string | null; workspace?: Workspace; revision: number; message?: string; }
export function readSource(adapter: StorageAdapter, key: string): ReadResult {
  let raw: string | null;
  try { raw = adapter.read(key); } catch (e) { return { code: "STORAGE_ERROR", key, raw: null, revision: 0, message: String(e) }; }
  if (raw === null) return { code: "MISSING", key, raw, revision: 0 };
  let data: unknown;
  try { data = JSON.parse(raw); } catch (e) { return { code: "PARSE_ERROR", key, raw, revision: 0, message: String(e) }; }
  try {
    let revision = 0;
    if (key === ACTIVE_KEY || key === SAFE_KEY) {
      if (!isRecord(data) || data.formatVersion !== 1) throw new DataError("UNSUPPORTED_VERSION", "Unsupported workspace envelope");
      if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) throw new DataError("SCHEMA_INVALID", "Invalid revision");
      revision = data.revision as number; data = data.workspace;
    }
    const workspace = migrateToV3(data);
    return { code: "READY", key, raw, revision, workspace: { ...workspace, workspaceRevision: revision } };
  } catch (e) {
    return { code: e instanceof DataError ? e.code as ReadCode : "SCHEMA_INVALID", key, raw, revision: 0, message: e instanceof Error ? e.message : String(e) };
  }
}
export function readWorkspace(adapter: StorageAdapter = localStorageAdapter()): ReadResult {
  for (const key of [ACTIVE_KEY, STORAGE_KEY_V3, ...STORAGE_KEYS_V2]) {
    const result = readSource(adapter, key);
    if (result.code !== "MISSING") return result;
  }
  return { code: "MISSING", key: ACTIVE_KEY, raw: null, revision: 0, workspace: emptyWorkspace() };
}
export function loadWorkspace(adapter: StorageAdapter = localStorageAdapter()): Workspace {
  const result = readWorkspace(adapter);
  if (!result.workspace) throw new DataError(result.code, result.message ?? result.code);
  return result.workspace;
}
export function domainPayload(ws: Workspace) {
  const { ui: _ui, workspaceRevision: _revision, ...rest } = ws;
  return rest;
}
export function encodeRecord(ws: Workspace, revision: number): string {
  assertWorkspace(ws);
  return JSON.stringify({ formatVersion: 1, revision, workspace: domainPayload(ws) });
}
/** Internal compare-and-swap. Caller holds the origin-wide exclusive write lock. */
export function writeRecord(adapter: StorageAdapter, source: ReadResult, ws: Workspace): number {
  if (!["READY", "MISSING"].includes(source.code)) throw new DataError("RECOVERY_REQUIRED", "Activate a validated recovery candidate first");
  const current = readWorkspace(adapter);
  if (current.key !== source.key || current.raw !== source.raw) throw new DataError("CONFLICT", "Workspace changed before commit");
  const revision = source.revision + 1;
  const encoded = encodeRecord(ws, revision);
  if (source.workspace && source.code === "READY") adapter.write(SAFE_KEY, encodeRecord(source.workspace, source.revision));
  adapter.write(ACTIVE_KEY, encoded);
  return revision;
}
/** Compatibility for explicit CAS callers; the product UI uses WorkspaceService. */
export function persistWorkspace(ws: Workspace, adapter: StorageAdapter = localStorageAdapter()): void {
  const source = readWorkspace(adapter);
  if ((ws.workspaceRevision ?? 0) !== source.revision) throw new DataError("CONFLICT", "Stale workspace revision");
  writeRecord(adapter, source, ws);
}
export function recoveryCandidates(adapter: StorageAdapter): ReadResult[] {
  return [SAFE_KEY, STORAGE_KEY_V3, ...STORAGE_KEYS_V2].map(k => readSource(adapter, k)).filter(r => r.code === "READY");
}
export function activateRecovery(adapter: StorageAdapter, original: ReadResult, candidate: Workspace, confirmation: boolean) {
  if (!confirmation) throw new DataError("CONFIRMATION_REQUIRED", "Confirm the validated recovery copy");
  assertWorkspace(candidate);
  const current = readWorkspace(adapter);
  if (current.raw !== original.raw || current.key !== original.key || current.code !== original.code) throw new DataError("CONFLICT", "Recovery source changed; inspect again");
  const encoded = encodeRecord({ ...candidate, ui: emptyUi() }, 1);
  if (original.code === "STORAGE_ERROR") throw new DataError("STORAGE_ERROR", "Cannot preserve unreadable source");
  if (original.raw !== null) {
    const key = `${RAW_PREFIX}${crypto.randomUUID()}`;
    const preserved = JSON.stringify({ sourceKey: original.key, raw: original.raw, preservedAt: new Date().toISOString() });
    adapter.write(key, preserved);
    if (adapter.read(key) !== preserved) throw new DataError("STORAGE_ERROR", "Could not verify preserved raw source");
  }
  adapter.write(ACTIVE_KEY, encoded);
}
export function exportWorkspace(ws: Workspace): string { return JSON.stringify(domainPayload(ws), null, 2); }
export function exportTree(ws: Workspace, treeId: string): string {
  const tree = ws.trees[treeId]; if (!tree) throw new DataError("NOT_FOUND", "Tree not found");
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, tree }, null, 2);
}
export function filenameForTree(title: string): string {
  const slug = title.trim().replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "") || "knowledge-tree";
  return `${slug}-knowledge-tree.json`;
}

export function workspaceContent(ws: Workspace): string {
  const { ui: _ui, currentTreeId: _selected, workspaceRevision: _revision, ...content } = ws;
  return JSON.stringify(content);
}
