import type { KnowledgeNode } from "./types.ts";
import { progressOf } from "./progress.ts";

export function parentIdOf(node: { parentId?: string | null }): string | null {
  return node.parentId || null;
}

export function isRootNode(node: { parentId?: string | null }): boolean {
  return parentIdOf(node) === null;
}

export function childrenOf(nodes: KnowledgeNode[], parentId: string | null): KnowledgeNode[] {
  return nodes
    .filter((n) => parentIdOf(n) === parentId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function descendantsOf(nodes: KnowledgeNode[], id: string): KnowledgeNode[] {
  const out: KnowledgeNode[] = [];
  const seen = new Set<string>();
  const stack = childrenOf(nodes, id).map((n) => n.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = byId.get(cur);
    if (!node) continue;
    out.push(node);
    for (const child of childrenOf(nodes, cur)) stack.push(child.id);
  }
  return out;
}

export function subtreeIds(nodes: KnowledgeNode[], id: string): string[] {
  return [id, ...descendantsOf(nodes, id).map((n) => n.id)];
}

export function subtreeOf(nodes: KnowledgeNode[], id: string): KnowledgeNode[] {
  const ids = new Set(subtreeIds(nodes, id));
  return nodes.filter((n) => ids.has(n.id));
}

export function ancestorChain(nodes: KnowledgeNode[], id: string): KnowledgeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: KnowledgeNode[] = [];
  const seen = new Set<string>();
  let cur = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    const pid = parentIdOf(cur);
    cur = pid ? byId.get(pid) : undefined;
  }
  return chain;
}

export function wouldCycle(nodes: KnowledgeNode[], nodeId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (nodeId === newParentId) return true;
  return descendantsOf(nodes, nodeId).some((n) => n.id === newParentId);
}

export function subtreeProgress(nodes: KnowledgeNode[], id: string) {
  return progressOf(subtreeOf(nodes, id));
}

export function childCount(nodes: KnowledgeNode[], id: string): number {
  return nodes.filter((n) => parentIdOf(n) === id).length;
}
