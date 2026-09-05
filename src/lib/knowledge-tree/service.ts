import { emptyUi, emptyWorkspace } from "./factory.ts";
import { indexedBlobStore, prepareFile, type BlobStore, type NodeAttachment } from "./files.ts";
import { uid } from "./ids.ts";
import { applyOperation, prepareOperation, uiOperations, type Commit, type Invocation, type UiInvocation } from "./operations.ts";
import { ACTIVE_KEY, SAFE_KEY, activateRecovery, localStorageAdapter, readSource, readWorkspace, writeRecord, workspaceContent, type ReadResult, type StorageAdapter } from "./storage.ts";
import type { KnowledgeTree, Workspace } from "./types.ts";
import { assertTree, assertWorkspace, DataError, isRecord, validateTree } from "./validation.ts";

export type SaveState = "SAVED" | "SAVING" | "SAVE_FAILED" | "DEGRADED" | "RECOVERY_REQUIRED";
export interface ServiceState { workspace: Workspace; status: SaveState; message: string; errorCode: string | null; recovery: ReadResult | null; }
export type Exclusive = <T>(work: () => Promise<T>) => Promise<T>;
export const WRITE_LOCK = "leo-tree-domain-write-v1";
export const browserExclusive: Exclusive = async work => {
  if (typeof navigator === "undefined" || !navigator.locks) throw new DataError("COORDINATION_UNAVAILABLE", "This browser cannot coordinate safe writes. Export your draft and use a browser with Web Locks in a secure context.");
  return navigator.locks.request(WRITE_LOCK, { mode: "exclusive" }, work);
};
export function memoryExclusive(): Exclusive {
  let tail = Promise.resolve();
  return work => { const result = tail.then(work); tail = result.then(() => undefined, () => undefined); return result; };
}
interface Pending { apply: (latest: Workspace) => Workspace; label: string; }
export function attachmentIds(ws: Workspace): Set<string> {
  return new Set(Object.values(ws.trees).flatMap(t => t.nodes.flatMap(n => (n.attachments ?? []).map(a => a.id))));
}
/** All writers use one queue and one origin lock. Components cannot submit a workspace. */
export class WorkspaceService {
  readonly adapter: StorageAdapter;
  readonly blobs: BlobStore;
  readonly exclusive: Exclusive;
  private state: ServiceState;
  private committed: Workspace;
  private pending: Pending[] = [];
  private staged = new Map<string, Blob>();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<boolean> | null = null;
  private readonly delay: number;
  private channel: BroadcastChannel | null = null;
  constructor(options: { adapter?: StorageAdapter; blobs?: BlobStore; exclusive?: Exclusive; delay?: number } = {}) {
    this.adapter = options.adapter ?? localStorageAdapter();
    this.blobs = options.blobs ?? indexedBlobStore;
    this.exclusive = options.exclusive ?? browserExclusive;
    this.delay = options.delay ?? 300;
    const source = readWorkspace(this.adapter);
    this.committed = source.workspace ?? emptyWorkspace();
    this.state = { workspace: this.committed, status: source.workspace ? "SAVED" : "RECOVERY_REQUIRED", message: source.workspace ? "" : source.message ?? source.code, errorCode: source.workspace ? null : source.code, recovery: source.workspace ? null : source };
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private emit() { for (const listener of this.listeners) listener(); }
  private set(patch: Partial<ServiceState>) { this.state = { ...this.state, ...patch }; this.emit(); }
  private preserveView(ws: Workspace): Workspace {
    const selected = this.state.workspace.currentTreeId;
    return { ...ws, currentTreeId: selected && ws.trees[selected] ? selected : ws.currentTreeId && ws.trees[ws.currentTreeId] ? ws.currentTreeId : Object.keys(ws.trees)[0] ?? null, ui: this.state.workspace.ui };
  }
  private fail(error: unknown) {
    const code = error instanceof DataError ? error.code : "STORAGE_ERROR";
    this.set({ status: code === "COORDINATION_UNAVAILABLE" ? "DEGRADED" : code === "RECOVERY_REQUIRED" ? "RECOVERY_REQUIRED" : "SAVE_FAILED", errorCode: code, message: error instanceof Error ? error.message : String(error) });
  }
  bind(snapshot: Workspace): Commit {
    return (...call) => {
      if (call[0] in uiOperations) { this.changeUi(call as UiInvocation); return; }
      if (call[0] === "duplicateTree") { void this.copyTree(call[1]); return; }
      try {
        const operation = prepareOperation(snapshot, call as Invocation);
        this.enqueue({ label: operation.name, apply: latest => applyOperation(latest, operation) });
      } catch (error) { this.fail(error); }
    };
  }
  changeUi(call: UiInvocation) {
    const [name,...args] = call;
    const fn = uiOperations[name] as (ws: Workspace, ...args: any[]) => Workspace;
    this.set({ workspace: fn(this.state.workspace,...args) });
    // UI updates never read or write the domain store.
  }
  private enqueue(entry: Pending, blobs: Array<[string,Blob]> = []) {
    if (this.state.recovery) throw new DataError("RECOVERY_REQUIRED", "Confirm a recovery candidate before editing");
    let next = entry.apply(this.state.workspace); assertWorkspace(next);
    if (!["createBlankTree", "createTreeFromTemplate", "CopyTree", "addNode", "addLog", "AcceptImportPreview"].includes(entry.label)) next = this.preserveView(next);
    for (const [id,blob] of blobs) this.staged.set(id,blob);
    this.pending.push(entry);
    const blocked = ["SAVE_FAILED", "DEGRADED"].includes(this.state.status);
    this.set({ workspace: next, ...(blocked ? {} : { status: "SAVING" as const, errorCode: null, message: "" }) });
    if (!blocked) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => { void this.flush(); }, this.delay);
    }
  }
  private async collectUnused(active: Workspace) {
    const used = attachmentIds(active);
    const safe = readSource(this.adapter, SAFE_KEY);
    if (safe.code !== "MISSING" && !safe.workspace) throw new DataError("CLEANUP_DEFERRED", "Unreadable recovery copy; attachment cleanup deferred");
    if (safe.workspace) {
      attachmentIds(safe.workspace).forEach(id => used.add(id));
      if (typeof safe.workspace.retainedGardenData === "string") {
        const previous = JSON.parse(safe.workspace.retainedGardenData);
        for (const g of previous.gardens ?? []) if (typeof g.art === "string" && g.art.startsWith("cover:")) used.add(g.art.slice(6));
        for (const p of previous.planted ?? []) for (const n of p.snapshot.nodes) for (const a of n.attachments ?? []) used.add(a.id);
      }
    }
    const raw = Object.hasOwn(active,"retainedGardenData") ? active.retainedGardenData as string | null : this.adapter.read("leo-tree-gardens-v1");
    if (raw !== null) {
      let gardens: unknown;
      try { gardens = JSON.parse(raw); } catch { throw new DataError("CLEANUP_DEFERRED", "Unreadable garden references; no files deleted"); }
      if (!isRecord(gardens) || !Array.isArray(gardens.gardens) || !Array.isArray(gardens.planted)) throw new DataError("CLEANUP_DEFERRED", "Unrecognised garden references; no files deleted");
      for (const g of gardens.gardens) if (isRecord(g) && typeof g.art === "string" && g.art.startsWith("cover:")) used.add(g.art.slice(6));
      for (const p of gardens.planted) {
        if (!isRecord(p) || !validateTree(p.snapshot).valid) throw new DataError("CLEANUP_DEFERRED", "Invalid garden snapshot; no files deleted");
        for (const n of (p.snapshot as KnowledgeTree).nodes) for (const a of n.attachments ?? []) used.add(a.id);
      }
    }
    // Pending local drafts also own their prepared bytes until retry/rescue/discard.
    this.staged.forEach((_blob,id) => used.add(id));
    await this.blobs.deleteMany((await this.blobs.keys()).filter(id => !used.has(id)));
  }
  async flush(): Promise<boolean> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.running) { const ok = await this.running; return ok && this.pending.length ? this.flush() : ok; }
    if (!this.pending.length) return !this.state.recovery && !["SAVE_FAILED","DEGRADED"].includes(this.state.status);
    const batch = [...this.pending];
    this.set({ status: "SAVING", errorCode: null, message: "" });
    this.running = this.exclusive(async () => {
      const source = readWorkspace(this.adapter);
      if (!source.workspace) { this.set({ recovery: source }); throw new DataError("RECOVERY_REQUIRED", source.message ?? source.code); }
      let next = { ...source.workspace, ui: emptyUi() };
      for (const entry of batch) next = entry.apply(next);
      assertWorkspace(next);
      const used = attachmentIds(next);
      const retained = next.retainedGardenData;
      if (typeof retained === "string") {
        const gardens = JSON.parse(retained);
        for (const g of gardens.gardens ?? []) if (typeof g.art === "string" && g.art.startsWith("cover:")) used.add(g.art.slice(6));
        for (const p of gardens.planted ?? []) for (const n of p.snapshot.nodes) for (const a of n.attachments ?? []) used.add(a.id);
      }
      const staged = [...this.staged].filter(([id]) => used.has(id));
      const newBytes: Array<[string,Blob]> = [];
      for (const [id,blob] of staged) {
        const existing = await this.blobs.get(id);
        if (existing) throw new DataError("CONFLICT", "Prepared file ID is already in use");
        newBytes.push([id,blob]);
      }
      let written = false;
      let revision: number;
      try {
        await this.blobs.putMany(newBytes); written = true;
        revision = writeRecord(this.adapter, source, next);
      } catch (error) {
        if (written) {
          try { await this.blobs.deleteMany(newBytes.map(([id]) => id)); }
          catch { /* The unique originals remain in the rescue draft. */ }
        }
        throw error;
      }
      // Once the active pointer commits, no later UI/cleanup error may roll back its bytes.
      this.committed = { ...next, workspaceRevision: revision };
      this.pending.splice(0,batch.length);
      for (const [id] of newBytes) this.staged.delete(id);
      let view = this.committed;
      for (const entry of this.pending) view = entry.apply(view);
      this.set({ workspace: this.preserveView(view), status: this.pending.length ? "SAVING" : "SAVED", errorCode: null, message: "" });
      this.channel?.postMessage({ revision: this.committed.workspaceRevision });
      try { await this.collectUnused(this.committed); }
      catch (error) { this.set({ status: "DEGRADED", errorCode: "CLEANUP_DEFERRED", message: `知识已保存；附件清理待重试。${String(error)}` }); }
      return true;
    }).catch(error => { this.fail(error); return false; }).finally(() => { this.running = null; });
    return this.running;
  }
  async refresh() {
    if (this.pending.length || this.running) return;
    const source = readWorkspace(this.adapter);
    if (!source.workspace) { this.set({ recovery: source, status: "RECOVERY_REQUIRED", errorCode: source.code, message: source.message ?? source.code }); return; }
    this.committed = source.workspace;
    this.set({ workspace: this.preserveView(source.workspace) });
  }
  start() {
    const refresh = () => { void this.refresh(); };
    const storage = (event: StorageEvent) => { if (!event.key || [ACTIVE_KEY,"knowledge-tree-workspace-v3"].includes(event.key)) refresh(); };
    const unload = (event: BeforeUnloadEvent) => { if (this.pending.length || this.running) { event.preventDefault(); event.returnValue = ""; } };
    const hide = () => { if (document.visibilityState === "hidden") void this.flush(); };
    window.addEventListener("storage",storage); window.addEventListener("focus",refresh); window.addEventListener("beforeunload",unload); document.addEventListener("visibilitychange",hide);
    if (typeof BroadcastChannel !== "undefined") { this.channel = new BroadcastChannel(WRITE_LOCK); this.channel.onmessage = refresh; }
    return () => { window.removeEventListener("storage",storage); window.removeEventListener("focus",refresh); window.removeEventListener("beforeunload",unload); document.removeEventListener("visibilitychange",hide); this.channel?.close(); this.channel = null; };
  }
  async addFiles(treeId: string, nodeId: string, files: File[]): Promise<boolean> {
    try {
      const prepared = await Promise.all(files.map(prepareFile));
      this.enqueue({ label: "AddAttachment", apply: latest => this.editFiles(latest,treeId,nodeId, files => [...files, ...prepared.map(p => p.metadata)]) }, prepared.map(p => [p.metadata.id,p.blob]));
      return await this.flush();
    } catch (error) { this.fail(error); return false; }
  }
  removeFile(treeId: string, nodeId: string, fileId: string) {
    try { this.enqueue({ label: "RemoveAttachment", apply: latest => this.editFiles(latest,treeId,nodeId, files => files.filter(f => f.id !== fileId)) }); }
    catch (error) { this.fail(error); }
  }
  private editFiles(ws: Workspace, treeId: string, nodeId: string, edit: (files: NodeAttachment[]) => NodeAttachment[]): Workspace {
    const tree = ws.trees[treeId];
    if (!tree?.nodes.some(n => n.id === nodeId)) throw new DataError("CONFLICT", "Attachment target was deleted; it has not been recreated");
    const next = { ...ws, trees: { ...ws.trees, [treeId]: { ...tree, nodes: tree.nodes.map(n => n.id === nodeId ? { ...n, attachments: edit(n.attachments ?? []) } : n) } } };
    assertWorkspace(next); return next;
  }
  async cloneAttachments(source: KnowledgeTree): Promise<{ tree: KnowledgeTree; files: Array<[string,Blob]> }> {
    const tree = structuredClone(source); const files: Array<[string,Blob]> = [];
    for (const n of tree.nodes) for (const a of n.attachments ?? []) {
      const blob = this.staged.get(a.id) ?? await this.blobs.get(a.id);
      if (!blob || blob.size !== a.size) throw new DataError("MISSING_ATTACHMENT", `Missing attachment bytes: ${a.name}`);
      a.id = uid("file"); files.push([a.id,blob]);
    }
    return { tree, files };
  }
  async copyTree(treeId: string): Promise<boolean> {
    try {
      const original = this.state.workspace.trees[treeId]; if (!original) throw new DataError("NOT_FOUND", "Tree not found");
      const expected = JSON.stringify(original);
      const { tree, files } = await this.cloneAttachments(original);
      tree.id = uid("tree"); tree.title += " 副本"; tree.createdAt = tree.updatedAt = new Date().toISOString(); assertTree(tree);
      this.enqueue({ label: "CopyTree", apply: latest => {
        if (JSON.stringify(latest.trees[treeId]) !== expected) throw new DataError("CONFLICT", "Source tree changed during copy; retry to copy its latest content");
        return { ...latest, currentTreeId: tree.id, trees: { ...latest.trees, [tree.id]: tree } };
      } }, files);
      return await this.flush();
    } catch (error) { this.fail(error); return false; }
  }
  /** Import/restore entry point requires a validated preview and exact reviewed domain revision. */
  async acceptPreview(preview: { workspace: Workspace; baseRevision: number; baseContent: string; files: Array<[string,Blob]> }, confirmed: boolean): Promise<boolean> {
    try {
      if (!confirmed) throw new DataError("CONFIRMATION_REQUIRED", "Confirm the preview first");
      assertWorkspace(preview.workspace);
      if (this.pending.length) throw new DataError("CONFLICT", "Save pending edits and regenerate the preview");
      this.enqueue({ label: "AcceptImportPreview", apply: latest => {
        if (Number(latest.workspaceRevision ?? 0) !== preview.baseRevision || workspaceContent(latest) !== preview.baseContent) throw new DataError("CONFLICT", "Workspace changed after preview; regenerate it");
        return { ...preview.workspace, ui: latest.ui };
      } }, preview.files);
      return await this.flush();
    } catch (error) { this.fail(error); return false; }
  }
  async recover(candidate: Workspace, confirmed: boolean) {
    try {
      await this.exclusive(async () => {
        if (!this.state.recovery) throw new DataError("CONFLICT", "No recovery source");
        activateRecovery(this.adapter,this.state.recovery,candidate,confirmed);
      });
      this.pending = []; this.staged.clear(); this.set({ recovery: null, status: "SAVED", errorCode: null, message: "" }); await this.refresh(); return true;
    } catch (error) { this.fail(error); return false; }
  }
  async discardDraft(confirmed: boolean) {
    if (!confirmed) return;
    this.pending = []; this.staged.clear(); this.set({ status: "SAVED", errorCode: null, message: "" }); await this.refresh();
  }
  rescueBytes(): Map<string,Blob> { return new Map(this.staged); }
  async retry() {
    if (this.pending.length) return this.flush();
    try { await this.exclusive(() => this.collectUnused(this.committed)); this.set({ status: "SAVED", errorCode: null, message: "" }); return true; }
    catch (error) { this.fail(error); return false; }
  }
}
