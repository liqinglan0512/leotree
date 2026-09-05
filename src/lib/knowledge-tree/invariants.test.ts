import assert from "node:assert/strict";
import { test } from "node:test";
import { addNode, addLog, addSection, createBlankTree, cycleNodeStatus, deleteNode, deleteSection, moveNode, moveNodeToSection, patchNode, patchReview, resetCurrentTreeProgress, setNodeParent } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { assertWorkspace, normalizeOrders, validateTree, validateWorkspace } from "./validation.ts";
import { childrenOf } from "./tree.ts";

function fixture() {
  let ws = createBlankTree(emptyWorkspace());
  for (let i = 0; i < 3; i++) ws = addNode(ws, "sec-1");
  return ws;
}
test("F04: duplicate IDs, cycles, missing section, parent and cross-section edges rejected", () => {
  const ws = fixture(); const t = ws.trees[ws.currentTreeId!];
  const variants = [
    { ...t, nodes: [...t.nodes, t.nodes[0]] },
    { ...t, sections: [...t.sections, t.sections[0]] },
    { ...t, nodes: t.nodes.map((n, i) => ({ ...n, parentId: t.nodes[(i + 1) % 3].id })) },
    { ...t, nodes: t.nodes.map(n => ({ ...n, sectionId: "missing" })) },
    { ...t, nodes: t.nodes.map(n => ({ ...n, parentId: "missing" })) },
    { ...t, nodes: null },
  ];
  for (const bad of variants) assert.equal(validateTree(bad).valid, false);
  assert.equal(validateWorkspace({ ...ws, currentTreeId: "missing" }).valid, false);
  assert.equal(validateWorkspace({ ...ws, trees: { wrong: t } }).valid, false);
  const other = structuredClone(t); other.id = "another-tree";
  assertWorkspace({ ...ws, trees: { ...ws.trees, [other.id]: other } }); // Node IDs are tree scoped.
});
test("F04: content patch cannot mutate identity/structure/status/history/files", () => {
  const ws = fixture(); const n = ws.trees[ws.currentTreeId!].nodes[0];
  for (const patch of [{ id: "changed" }, { parentId: n.id }, { sectionId: "x" }, { status: "done" }, { statusHistory: [] }, { attachments: [] }]) {
    assert.throws(() => patchNode(ws, n.id, patch as never), /Content patch/);
  }
  assert.throws(() => moveNodeToSection(ws, n.id, "missing"), /Missing section/);
});
test("F04: deleting a section or subtree repairs practice and node links", () => {
  let ws = fixture(); const id = ws.currentTreeId!; const [a,b] = ws.trees[id].nodes;
  ws = addSection(ws, "keep"); const sec = ws.trees[id].sections[1].id;
  ws = moveNodeToSection(ws, b.id, sec);
  ws = patchNode(ws, b.id, { relatedNodeIds: [a.id], prerequisiteIds: [a.id] });
  ws = addLog(ws, { linkedNodeIds: [a.id,b.id] });
  ws = deleteSection(ws, "sec-1");
  assertWorkspace(ws);
  assert.deepEqual(ws.trees[id].logs[0].linkedNodeIds, [b.id]);
  assert.deepEqual(ws.trees[id].nodes[0].relatedNodeIds, []);
  assert.deepEqual(ws.trees[id].nodes[0].prerequisiteIds, []);
});
test("F05: reset learning state preserves knowledge, reviews, logs, attachments, structure", () => {
  let ws = fixture(); const id = ws.currentTreeId!; const n = ws.trees[id].nodes[0];
  ws = patchNode(ws, n.id, { note: "valuable understanding" });
  ws = cycleNodeStatus(ws, n.id);
  ws = addLog(ws, { title: "practice", linkedNodeIds: [n.id] });
  ws = patchReview(ws, "2026-08-31", { summary: "reflection" });
  const before = structuredClone(ws.trees[id]);
  ws = resetCurrentTreeProgress(ws);
  assert.equal(ws.trees[id].nodes[0].status, "todo");
  assert.equal(ws.trees[id].nodes[0].note, "valuable understanding");
  assert.deepEqual(ws.trees[id].reviews, before.reviews);
  assert.deepEqual(ws.trees[id].logs, before.logs);
  assert.deepEqual(ws.trees[id].sections, before.sections);
  assert.deepEqual(ws.trees[id].nodes[0].attachments, before.nodes[0].attachments);
});
test("F13: delete → add → move → reparent maintains contiguous effective order", () => {
  let ws = fixture(); const id = ws.currentTreeId!; const [a,b,c] = ws.trees[id].nodes;
  ws = deleteNode(ws, b.id); ws = addNode(ws, "sec-1");
  const d = ws.trees[id].nodes.at(-1)!;
  assert.deepEqual(childrenOf(ws.trees[id].nodes, null).map(n => n.order), [0,1,2]);
  ws = moveNode(ws, d.id, -1);
  assert.deepEqual(childrenOf(ws.trees[id].nodes, null).map(n => n.id), [a.id,d.id,c.id]);
  ws = setNodeParent(ws, c.id, a.id); ws = setNodeParent(ws, d.id, a.id);
  ws = moveNode(ws, d.id, -1); ws = setNodeParent(ws, d.id, null);
  assertWorkspace(ws);
  assert.deepEqual(ws.trees[id], normalizeOrders(ws.trees[id]));
});
