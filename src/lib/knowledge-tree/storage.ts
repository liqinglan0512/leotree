import { emptyWorkspace } from "./factory.ts";
import { migrateToV3 } from "./migrate.ts";
import type { Workspace } from "./types.ts";
import { SCHEMA_VERSION, STORAGE_KEY_V3, STORAGE_KEYS_V2 } from "./types.ts";

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export function localStorageAdapter(): StorageAdapter {
  return {
    read(key) {
      try {
        if (typeof localStorage === "undefined") return null;
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, value);
    },
    remove(key) {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    },
  };
}

export function memoryAdapter(seed: Record<string, string> = {}): StorageAdapter {
  const map = { ...seed };
  return {
    read: (k) => (k in map ? map[k] : null),
    write: (k, v) => {
      map[k] = v;
    },
    remove: (k) => {
      delete map[k];
    },
  };
}

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadWorkspace(adapter: StorageAdapter = localStorageAdapter()): Workspace {
  const v3 = parse(adapter.read(STORAGE_KEY_V3));
  if (v3) {
    const ws = migrateToV3(v3);
    persistWorkspace(ws, adapter);
    return ws;
  }
  for (const key of STORAGE_KEYS_V2) {
    const raw = parse(adapter.read(key));
    if (raw) {
      const ws = migrateToV3(raw);
      persistWorkspace(ws, adapter);
      return ws;
    }
  }
  return emptyWorkspace();
}

export function persistWorkspace(ws: Workspace, adapter: StorageAdapter = localStorageAdapter()): void {
  const payload: Workspace = { ...ws, schemaVersion: SCHEMA_VERSION };
  adapter.write(STORAGE_KEY_V3, JSON.stringify(payload));
}

export function exportWorkspace(ws: Workspace): string {
  const { ui: _ui, ...rest } = ws;
  return JSON.stringify({ ...rest, schemaVersion: SCHEMA_VERSION }, null, 2);
}

export function exportTree(ws: Workspace, treeId: string): string {
  const tree = ws.trees[treeId];
  if (!tree) throw new Error("tree not found");
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, tree }, null, 2);
}

export function filenameForTree(title: string): string {
  const slug = title.trim().replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "") || "knowledge-tree";
  return `${slug}-knowledge-tree.json`;
}
