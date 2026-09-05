import { parseImport } from "./migrate.ts";
import { uid } from "./ids.ts";
import type { KnowledgeTree, Workspace } from "./types.ts";
import { assertWorkspace, DataError, normalizeOrders } from "./validation.ts";
import type { WorkspaceService } from "./service.ts";

export type ImportMode = "new" | "restore" | "merge";
export type Conflict = { treeId: string; nodeId?: string; kind: "same-tree" | "same-node" | "newer" | "older" | "structure" | "attachment"; detail: string };
export interface ImportPreview { workspace: Workspace; baseRevision: number; files: Array<[string,Blob]>; conflicts: Conflict[]; mode: ImportMode; omittedAttachments: number; }
const same = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function analyzeImport(ws: Workspace, incoming: KnowledgeTree[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const tree of incoming) {
    const old = ws.trees[tree.id]; if (!old) continue;
    conflicts.push({ treeId: tree.id, kind: "same-tree", detail: `同一知识树：${tree.title}` });
    if (!same(old.sections,tree.sections)) conflicts.push({ treeId: tree.id, kind: "structure", detail: "分区结构或名称不同；合并保留未冲突的现有分区" });
    for (const n of tree.nodes) {
      const prev = old.nodes.find(p => p.id === n.id); if (!prev) continue;
      conflicts.push({ treeId: tree.id, nodeId: n.id, kind: "same-node", detail: `同一节点：${n.title}` });
      if (!same(prev,n)) conflicts.push({ treeId: tree.id, nodeId: n.id, kind: Date.parse(n.updatedAt) < Date.parse(prev.updatedAt) ? "older" : "newer", detail: `本机 ${prev.updatedAt}；导入 ${n.updatedAt}（时间只作提示，以内容预览和明确选择为准）` });
      if (prev.sectionId !== n.sectionId || (prev.parentId ?? null) !== (n.parentId ?? null)) conflicts.push({ treeId: tree.id, nodeId: n.id, kind: "structure", detail: "父节点或分区归属不同" });
      if (!same(prev.attachments ?? [],n.attachments ?? [])) conflicts.push({ treeId: tree.id, nodeId: n.id, kind: "attachment", detail: "附件引用不同；采用导入内容时必须复制实际字节或明确放弃附件" });
    }
  }
  return conflicts;
}
function mergeById<T extends { id: string }>(current: T[], incoming: T[], preferIncoming: boolean): T[] {
  const map = new Map(current.map(v => [v.id,v]));
  for (const v of incoming) if (!map.has(v.id) || preferIncoming) map.set(v.id,v);
  return [...map.values()];
}
export async function previewImport(service: WorkspaceService, raw: unknown, mode: ImportMode = "new", options: { preferIncoming?: boolean; omitAttachments?: boolean } = {}): Promise<ImportPreview> {
  if (!await service.flush()) throw new DataError("SAVE_FAILED", "Save or rescue pending content before importing");
  const ws = service.getSnapshot().workspace;
  const incoming = parseImport(raw);
  if (!incoming.length) throw new DataError("SCHEMA_INVALID", "No knowledge trees in import");
  const ids = new Set(incoming.map(t => t.id));
  if (ids.size !== incoming.length) throw new DataError("RELATION_INVALID", "Duplicate tree IDs in import");
  const conflicts = analyzeImport(ws,incoming);
  const files: Array<[string,Blob]> = []; const trees = { ...ws.trees }; let currentTreeId = ws.currentTreeId;
  let omittedAttachments = 0;
  for (const source of incoming) {
    const old = ws.trees[source.id];
    if (mode !== "new" && !old) throw new DataError("CONFLICT", "Restore/merge requires matching tree ID; use import as new");
    if (mode === "restore" && !options.preferIncoming) throw new DataError("CONFIRMATION_REQUIRED", "Restore requires explicitly choosing imported content, including older content");
    let tree = structuredClone(source);
    if (mode === "merge") {
      tree = {
        ...(options.preferIncoming ? { ...old,...tree } : { ...tree,...old }),
        sections: mergeById(old.sections,tree.sections,!!options.preferIncoming),
        nodes: mergeById(old.nodes,tree.nodes,!!options.preferIncoming),
        logs: mergeById(old.logs,tree.logs,!!options.preferIncoming),
        reviews: options.preferIncoming ? { ...old.reviews,...tree.reviews } : { ...tree.reviews,...old.reviews },
        settings: options.preferIncoming ? { ...old.settings,...tree.settings } : { ...tree.settings,...old.settings },
      };
    }
    // Only incoming nodes need new attachment ownership; retained local nodes keep theirs.
    const incomingNodeIds = new Set(source.nodes.filter(n => mode !== "merge" || options.preferIncoming || !old.nodes.some(o => o.id === n.id)).map(n => n.id));
    for (let i = 0; i < tree.nodes.length; i++) {
      const n = tree.nodes[i]; if (!incomingNodeIds.has(n.id)) continue;
      if (options.omitAttachments) { omittedAttachments += n.attachments?.length ?? 0; tree.nodes[i] = { ...n, attachments: [] }; }
      else {
        const cloned = await service.cloneAttachments({ ...tree, nodes: [n] });
        tree.nodes[i] = cloned.tree.nodes[0]; files.push(...cloned.files);
      }
    }
    if (mode === "new") { tree.id = uid("tree"); tree.createdAt = tree.updatedAt = new Date().toISOString(); }
    trees[tree.id] = normalizeOrders(tree); currentTreeId = tree.id;
  }
  const workspace = { ...ws, trees, currentTreeId };
  assertWorkspace(workspace); // Merging valid inputs can still produce an invalid cross-input graph.
  return { workspace, baseRevision: Number(ws.workspaceRevision ?? 0), files, conflicts, mode, omittedAttachments };
}
