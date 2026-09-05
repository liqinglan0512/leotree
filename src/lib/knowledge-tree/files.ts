import { nowISO, uid } from "./ids";

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
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

export async function putBlob(id: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deleteBlob(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteBlobs(ids: string[]) {
  await Promise.all(ids.map((id) => deleteBlob(id)));
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
