import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addNode,
  createBlankTree,
  deleteNode,
  focusNode,
  moveNode,
  setNodeParent,
} from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { ancestorChain, childrenOf, wouldCycle } from "./tree.ts";

describe("nested nodes", () => {
  it("adds children infinitely and keeps sibling order", () => {
    let ws = createBlankTree(emptyWorkspace(), "枝干");
    const treeId = ws.currentTreeId!;
    const sec = ws.trees[treeId].sections[0];
    assert.ok(sec);
    ws = addNode(ws, sec.id);
    const root = ws.trees[treeId].nodes[0];
    ws = addNode(ws, sec.id, root.id);
    ws = addNode(ws, sec.id, root.id);
    const kids = childrenOf(ws.trees[treeId].nodes, root.id);
    assert.equal(kids.length, 2);
    const child = kids[0];
    ws = addNode(ws, sec.id, child.id);
    const grand = childrenOf(ws.trees[treeId].nodes, child.id);
    assert.equal(grand.length, 1);
    assert.equal(grand[0].parentId, child.id);
    assert.equal(grand[0].sectionId, sec.id);
    const chain = ancestorChain(ws.trees[treeId].nodes, grand[0].id);
    assert.deepEqual(chain.map((n) => n.id), [root.id, child.id, grand[0].id]);
  });

  it("delete cascades through descendants and unlinks logs", () => {
    let ws = createBlankTree(emptyWorkspace(), "枝干");
    const treeId = ws.currentTreeId!;
    const sec = ws.trees[treeId].sections[0]!;
    ws = addNode(ws, sec.id);
    const root = ws.trees[treeId].nodes[0]!;
    ws = addNode(ws, sec.id, root.id);
    const child = childrenOf(ws.trees[treeId].nodes, root.id)[0]!;
    ws = addNode(ws, sec.id, child.id);
    ws = focusNode(ws, child.id);
    assert.equal(ws.ui.focusNodeId, child.id);
    ws = deleteNode(ws, root.id);
    assert.equal(ws.trees[treeId].nodes.length, 0);
    assert.equal(ws.ui.focusNodeId, null);
  });

  it("rejects cyclic reparent and moves among siblings only", () => {
    let ws = createBlankTree(emptyWorkspace(), "枝干");
    const treeId = ws.currentTreeId!;
    const sec = ws.trees[treeId].sections[0]!;
    ws = addNode(ws, sec.id);
    const root = ws.trees[treeId].nodes[0]!;
    ws = addNode(ws, sec.id, root.id);
    ws = addNode(ws, sec.id, root.id);
    const [a, b] = childrenOf(ws.trees[treeId].nodes, root.id);
    assert.equal(wouldCycle(ws.trees[treeId].nodes, root.id, a.id), true);
    const cyclic = setNodeParent(ws, root.id, a.id);
    assert.equal(cyclic.trees[treeId].nodes.find((n) => n.id === root.id)?.parentId ?? null, null);
    ws = moveNode(ws, a.id, 1);
    const after = childrenOf(ws.trees[treeId].nodes, root.id);
    assert.deepEqual(after.map((n) => n.id), [b.id, a.id]);
    ws = setNodeParent(ws, a.id, null);
    assert.equal(ws.trees[treeId].nodes.find((n) => n.id === a.id)?.parentId ?? null, null);
  });
});
