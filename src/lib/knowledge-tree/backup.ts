import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { domainPayload, workspaceContent } from "./storage.ts";
import { emptyUi, emptyWorkspace } from "./factory.ts";
import { migrateToV3 } from "./migrate.ts";
import { attachmentIds, type WorkspaceService } from "./service.ts";
import type { KnowledgeTree, Workspace } from "./types.ts";
import { assertWorkspace, DataError, isRecord, validId, validateTree } from "./validation.ts";

export const APP_VERSION = "1.0.0-rc.1";
export interface BackupManifest {
  backupVersion: 1; appVersion: string; createdAt: string; workspaceHash: string; artifactCount: number; attachmentCount: number;
  artifacts: Array<{ path: string; sha256: string; size: number; id?: string; mime?: string }>;
  counts: { trees: number; sections: number; nodes: number; reviews: number; logs: number };
  rescue: boolean;
}
export const sha256 = async (bytes: Uint8Array): Promise<string> => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes)))).map(v => v.toString(16).padStart(2,"0")).join("");
function counts(ws: Workspace): BackupManifest["counts"] {
  const trees = Object.values(ws.trees);
  return { trees: trees.length, sections: trees.reduce((n,t) => n+t.sections.length,0), nodes: trees.reduce((n,t) => n+t.nodes.length,0), reviews: trees.reduce((n,t) => n+Object.keys(t.reviews).length,0), logs: trees.reduce((n,t) => n+t.logs.length,0) };
}
function gardenReferences(raw: string | null): Set<string> {
  const refs = new Set<string>(); if (raw === null) return refs;
  let state: unknown;
  try { state = JSON.parse(raw); } catch { throw new DataError("SCHEMA_INVALID", "Garden data is corrupt; export its raw source before backup"); }
  if (!isRecord(state) || !Array.isArray(state.gardens) || !Array.isArray(state.planted)) throw new DataError("SCHEMA_INVALID", "Invalid garden metadata");
  for (const garden of state.gardens) if (isRecord(garden) && typeof garden.art === "string" && garden.art.startsWith("cover:")) refs.add(garden.art.slice(6));
  for (const planted of state.planted) {
    if (!isRecord(planted) || !validateTree(planted.snapshot).valid) throw new DataError("RELATION_INVALID", "Invalid retained garden snapshot");
    for (const n of (planted.snapshot as KnowledgeTree).nodes) for (const a of n.attachments ?? []) refs.add(a.id);
  }
  return refs;
}
export async function createBackup(service: WorkspaceService, rescue = false): Promise<Uint8Array> {
  if (!rescue && !await service.flush()) throw new DataError("SAVE_FAILED", "Save failed; use rescue export for your pending content");
  const build = async () => {
    if (!rescue) await service.refresh();
    const ws = service.getSnapshot().workspace; assertWorkspace(ws);
    const archive: Record<string,Uint8Array> = { "workspace.json": strToU8(JSON.stringify(domainPayload(ws))) };
    const gardenRaw = Object.hasOwn(ws,"retainedGardenData") ? ws.retainedGardenData as string | null : service.adapter.read("leo-tree-gardens-v1");
    const domainRefs = attachmentIds(ws); const gardenRefs = gardenReferences(gardenRaw);
    if (gardenRaw !== null) archive["garden-assets/gardens.json"] = strToU8(gardenRaw);
    const staged = service.rescueBytes();
    if (rescue) staged.forEach((_blob,id) => domainRefs.add(id));
    const ids = new Set([...domainRefs,...gardenRefs]);
    const fileArtifacts: BackupManifest["artifacts"] = [];
    for (const id of ids) {
      if (!validId(id)) throw new DataError("SCHEMA_INVALID", "Invalid attachment ID");
      const blob = staged.get(id) ?? await service.blobs.get(id);
      if (!blob) throw new DataError("MISSING_ATTACHMENT", `Cannot make a complete backup: missing ${id}`);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const path = `${domainRefs.has(id) ? "attachments" : "garden-assets"}/${encodeURIComponent(id)}.blob`;
      archive[path] = bytes; fileArtifacts.push({ path,id,size: bytes.length,sha256: await sha256(bytes),mime: blob.type });
    }
    const artifacts: BackupManifest["artifacts"] = [];
    for (const [path,bytes] of Object.entries(archive)) if (!fileArtifacts.some(a => a.path === path)) artifacts.push({ path,size: bytes.length,sha256: await sha256(bytes) });
    artifacts.push(...fileArtifacts);
    const manifest: BackupManifest = { backupVersion: 1,appVersion: APP_VERSION,createdAt: new Date().toISOString(),workspaceHash: await sha256(archive["workspace.json"]),artifactCount: artifacts.length,attachmentCount: ids.size,artifacts,counts: counts(ws),rescue };
    archive["manifest.json"] = strToU8(JSON.stringify(manifest,null,2));
    return zipSync(archive,{ level: 6 });
  };
  return rescue ? build() : service.exclusive(build);
}
export interface BackupPreview { workspace: Workspace; baseRevision: number; baseContent: string; files: Array<[string,Blob]>; manifest: BackupManifest; gardenRaw: string | null; }
export async function readBackup(bytes: Uint8Array, baseRevision: number): Promise<BackupPreview> {
  if (bytes.byteLength > 300 * 1024 * 1024) throw new DataError("SCHEMA_INVALID", "Backup exceeds 300 MiB import limit");
  let total = 0;
  const archive = unzipSync(bytes,{ filter: entry => {
    if (entry.name.includes("..") || entry.name.startsWith("/") || entry.name.includes("\\")) throw new DataError("SCHEMA_INVALID", "Unsafe archive path");
    total += entry.originalSize; if (total > 500 * 1024 * 1024) throw new DataError("SCHEMA_INVALID", "Unpacked backup exceeds 500 MiB"); return true;
  } });
  const raw = JSON.parse(strFromU8(archive["manifest.json"] ?? new Uint8Array())) as unknown;
  if (!isRecord(raw) || raw.backupVersion !== 1) throw new DataError("UNSUPPORTED_VERSION", "Unsupported backup format");
  if (!Array.isArray(raw.artifacts) || !raw.artifacts.every(a => isRecord(a) && typeof a.path === "string" && typeof a.sha256 === "string" && Number.isSafeInteger(a.size))) throw new DataError("SCHEMA_INVALID", "Invalid artifact manifest");
  const manifest = raw as unknown as BackupManifest;
  if (manifest.artifactCount !== manifest.artifacts.length || new Set(manifest.artifacts.map(a => a.path)).size !== manifest.artifacts.length || Object.keys(archive).length !== manifest.artifactCount + 1) throw new DataError("SCHEMA_INVALID", "Artifact count/uniqueness mismatch");
  for (const a of manifest.artifacts) {
    const content = archive[a.path]; if (!content || content.length !== a.size || await sha256(content) !== a.sha256) throw new DataError("HASH_MISMATCH", `Corrupt artifact ${a.path}`);
  }
  if (!archive["workspace.json"] || await sha256(archive["workspace.json"]) !== manifest.workspaceHash) throw new DataError("HASH_MISMATCH", "Workspace hash mismatch");
  const workspace = migrateToV3(JSON.parse(strFromU8(archive["workspace.json"])));
  if (JSON.stringify(counts(workspace)) !== JSON.stringify(manifest.counts)) throw new DataError("SCHEMA_INVALID", "Knowledge counts mismatch");
  const gardenRaw = archive["garden-assets/gardens.json"] ? strFromU8(archive["garden-assets/gardens.json"]) : null;
  const needed = new Set([...attachmentIds(workspace),...gardenReferences(gardenRaw)]);
  const files: Array<[string,Blob]> = [];
  for (const a of manifest.artifacts.filter(a => a.id !== undefined)) {
    if (!validId(a.id) || files.some(([id]) => id === a.id)) throw new DataError("SCHEMA_INVALID", "Invalid or duplicate attachment ID");
    files.push([a.id,new Blob([new Uint8Array(archive[a.path])],{ type: a.mime ?? "" })]);
    needed.delete(a.id);
  }
  if (needed.size || files.length !== manifest.attachmentCount) throw new DataError("MISSING_ATTACHMENT", "Backup is missing attachment bytes");
  for (const t of Object.values(workspace.trees)) for (const n of t.nodes) for (const a of n.attachments ?? []) if (files.find(([id]) => id === a.id)?.[1].size !== a.size) throw new DataError("SCHEMA_INVALID", "Attachment metadata size differs from bytes");
  return { workspace: { ...workspace, retainedGardenData: gardenRaw, ui: emptyUi() },baseRevision,baseContent:workspaceContent(emptyWorkspace()),files,manifest,gardenRaw };
}

/** Existing bytes are never overwritten when restoring over a used profile. */
export async function previewBackupRestore(service: WorkspaceService, bytes: Uint8Array): Promise<BackupPreview> {
  if (!await service.flush()) throw new DataError("SAVE_FAILED", "Save or rescue pending edits before restoring");
  const result = await readBackup(bytes, Number(service.getSnapshot().workspace.workspaceRevision ?? 0));
  result.baseContent = workspaceContent(service.getSnapshot().workspace);
  const replacements = new Map<string,string>();
  for (const [id] of result.files) if (await service.blobs.get(id)) replacements.set(id, `file-${crypto.randomUUID()}`);
  const remapTree = (tree: KnowledgeTree) => { for (const n of tree.nodes) for (const a of n.attachments ?? []) a.id = replacements.get(a.id) ?? a.id; };
  Object.values(result.workspace.trees).forEach(remapTree);
  if (result.gardenRaw) {
    const gardens = JSON.parse(result.gardenRaw);
    for (const g of gardens.gardens) if (g.art.startsWith("cover:") && replacements.has(g.art.slice(6))) g.art = `cover:${replacements.get(g.art.slice(6))}`;
    for (const p of gardens.planted) remapTree(p.snapshot);
    result.gardenRaw = JSON.stringify(gardens); result.workspace.retainedGardenData = result.gardenRaw;
  }
  result.files = result.files.map(([id,blob]) => [replacements.get(id) ?? id,blob]);
  return result;
}
