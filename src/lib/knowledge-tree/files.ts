import { nowISO, uid } from "./ids.ts";
import { DataError } from "./validation.ts";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export type FileKind = "png" | "md" | "pdf" | "docx";

export type NodeAttachment = {
  id: string;
  name: string;
  kind: FileKind;
  size: number;
  addedAt: string;
};

const DB_NAME = "leo-tree-files-v1";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    let expired = false;
    const timer = setTimeout(() => { expired = true; reject(new DataError("STORAGE_ERROR", "IndexedDB open timed out")); }, 8000);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => { clearTimeout(timer); if (expired) { req.result.close(); return; } req.result.onversionchange = () => req.result.close(); resolve(req.result); };
    req.onerror = () => { clearTimeout(timer); reject(new DataError("STORAGE_ERROR", String(req.error))); };
    req.onblocked = () => { clearTimeout(timer); expired = true; reject(new DataError("STORAGE_ERROR", "IndexedDB upgrade blocked by another tab")); };
  });
}

export interface BlobStore {
  get(id: string): Promise<Blob | null>;
  putMany(entries: Array<[string, Blob]>): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  keys(): Promise<string[]>;
}
async function transaction<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(new DataError("STORAGE_ERROR", String(tx.error ?? "IndexedDB transaction aborted")));
      try { const request = body(tx.objectStore(STORE)); if (request) request.onsuccess = () => { value = request.result; }; }
      catch (e) { tx.abort(); reject(new DataError("STORAGE_ERROR", String(e))); }
    });
  } finally { db.close(); }
}
export const indexedBlobStore: BlobStore = {
  get: async id => (await transaction("readonly", store => store.get(id))) ?? null,
  // IDs are immutable. add() rejects collisions instead of replacing another tree's bytes.
  putMany: async entries => { if (entries.length) await transaction("readwrite", store => { for (const [id,blob] of entries) store.add(blob,id); }); },
  deleteMany: async ids => { if (ids.length) await transaction("readwrite", store => { for (const id of ids) store.delete(id); }); },
  keys: async () => (await transaction("readonly", store => store.getAllKeys())).map(String),
};
export function memoryBlobStore(seed: Array<[string,Blob]> = []): BlobStore {
  const map = new Map(seed);
  return { get: async id => map.get(id) ?? null,
    putMany: async entries => { if (entries.some(([id]) => map.has(id))) throw new DataError("STORAGE_ERROR", "Blob ID collision"); for (const [id,blob] of entries) map.set(id,blob); },
    deleteMany: async ids => { ids.forEach(id => map.delete(id)); }, keys: async () => [...map.keys()] };
}

export function sniffKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (name.endsWith(".png") || type === "image/png") return "png";
  if (name.endsWith(".md") || type.includes("markdown")) return "md";
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

export function validateFile(file: File): { ok: true; kind: FileKind } | { ok: false; error: "type" | "size" } {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "size" };
  const kind = sniffKind(file);
  if (!kind) return { ok: false, error: "type" };
  return { ok: true, kind };
}

export const putBlob = (id: string, blob: Blob) => indexedBlobStore.putMany([[id,blob]]);
export const getBlob = (id: string) => indexedBlobStore.get(id);
export const deleteBlob = (id: string) => indexedBlobStore.deleteMany([id]);
export const deleteBlobs = (ids: string[]) => indexedBlobStore.deleteMany(ids);

export async function prepareFile(file: File): Promise<{ metadata: NodeAttachment; blob: Blob }> {
  const check = validateFile(file);
  if (!check.ok) throw new DataError(check.error === "size" ? "FILE_TOO_LARGE" : "FILE_UNSUPPORTED", check.error);
  const header = new Uint8Array(await file.slice(0,8).arrayBuffer());
  const starts = (bytes: number[]) => bytes.every((v,i) => header[i] === v);
  if ((check.kind === "png" && !starts([137,80,78,71,13,10,26,10])) || (check.kind === "pdf" && !starts([37,80,68,70,45])) || (check.kind === "docx" && !starts([80,75,3,4]))) throw new DataError("FILE_UNSUPPORTED", "File content does not match its type");
  return { metadata: { id: uid("file"), name: file.name, kind: check.kind, size: file.size, addedAt: nowISO() }, blob: file };
}

export async function addFile(file: File): Promise<NodeAttachment> {
  const check = validateFile(file);
  if (!check.ok) {
    const err = new Error(check.error);
    err.name = check.error;
    throw err;
  }
  const id = uid("file");
  await putBlob(id, file);
  return {
    id,
    name: file.name,
    kind: check.kind,
    size: file.size,
    addedAt: nowISO(),
  };
}

export function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function nodeAttachments(node: { attachments?: unknown }): NodeAttachment[] {
  const raw = node.attachments;
  return Array.isArray(raw) ? (raw as NodeAttachment[]) : [];
}
