import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addLog,
  addNode,
  addSection,
  createBlankTree,
  createTreeFromTemplate,
  cycleNodeStatus,
  deleteNode,
  deleteTree,
  duplicateTree,
  patchNode,
  resetCurrentTreeProgress,
} from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { treeLogFields, treeReviewFields } from "./fields.ts";
import { mergeTreeIntoWorkspace } from "./migrate.ts";
import { snnLogHasRisk } from "./templates/snn.ts";
import { exportTree, filenameForTree } from "./storage.ts";

describe("engine structure edit", () => {
  it("adds sections and nodes on a blank tree", () => {
    let ws = createBlankTree(emptyWorkspace(), "高等数学");
    const treeId = ws.currentTreeId!;
    assert.equal(ws.trees[treeId].title, "高等数学");
    assert.equal(ws.trees[treeId].templateId, "blank");
    assert.equal(treeLogFields(ws.trees[treeId]).length, 0);
    assert.equal(treeReviewFields(ws.trees[treeId]).length, 0);
    ws = addSection(ws, "极限");
    const sec = ws.trees[treeId].sections.find((s) => s.title === "极限");
    assert.ok(sec);
    ws = addNode(ws, sec!.id);
    const node = ws.trees[treeId].nodes.find((n) => n.sectionId === sec!.id);
    assert.equal(node?.title, "未命名节点");
    ws = patchNode(ws, node!.id, { title: "ε-δ 定义", hint: "用邻域说话" });
    assert.equal(ws.trees[treeId].nodes.find((n) => n.id === node!.id)?.title, "ε-δ 定义");
    ws = addLog(ws, { title: "习题", linkedNodeIds: [node!.id] });
    ws = deleteNode(ws, node!.id);
    assert.equal(ws.trees[treeId].nodes.length, 0);
    assert.deepEqual(ws.trees[treeId].logs[0].linkedNodeIds, []);
  });

  it("isolates two trees", () => {
    let ws = createBlankTree(emptyWorkspace(), "高等数学");
    const idA = ws.currentTreeId!;
    ws = createTreeFromTemplate(ws, "snn-calibration");
    const idB = ws.currentTreeId!;
    assert.notEqual(idA, idB);
    assert.equal(ws.trees[idA].title, "高等数学");
    assert.equal(ws.trees[idB].title, "SNN");
    const snnNode = ws.trees[idB].nodes.find((n) => n.id === "A01")!;
    ws = cycleNodeStatus(ws, snnNode.id);
    assert.equal(ws.trees[idB].nodes.find((n) => n.id === "A01")?.status, "doing");
    assert.ok(ws.trees[idA].nodes.every((n) => n.status === "todo"));
    ws = addLog(ws, { title: "SNN only" });
    assert.equal(ws.trees[idB].logs[0].title, "SNN only");
    assert.equal(ws.trees[idA].logs.length, 0);
  });

  it("duplicate, delete, reset progress", () => {
    let ws = createTreeFromTemplate(emptyWorkspace(), "snn-calibration");
    const id = ws.currentTreeId!;
    ws = cycleNodeStatus(ws, "A01");
    ws = duplicateTree(ws, id);
    const copyId = ws.currentTreeId!;
    assert.equal(ws.trees[copyId].title, "SNN 副本");
    assert.equal(ws.trees[copyId].nodes.find((n) => n.id === "A01")?.status, "doing");
    ws = resetCurrentTreeProgress(ws);
    assert.equal(ws.trees[copyId].nodes.find((n) => n.id === "A01")?.status, "todo");
    assert.equal(ws.trees[id].nodes.find((n) => n.id === "A01")?.status, "doing");
    ws = deleteTree(ws, copyId);
    assert.equal(ws.currentTreeId, id);
  });
});

describe("template custom fields", () => {
  it("SNN template still has A-F, E12, F10 and leak fields", () => {
    const ws = createTreeFromTemplate(emptyWorkspace(), "snn-calibration");
    const tree = ws.trees[ws.currentTreeId!];
    assert.ok(tree.nodes.some((n) => n.id === "E12"));
    assert.ok(tree.nodes.some((n) => n.id === "F10"));
    assert.equal(tree.sections.length, 6);
    const logIds = treeLogFields(tree).map((f) => f.id);
    assert.ok(logIds.includes("ece"));
    assert.ok(logIds.includes("noTestLeak"));
    const reviewIds = treeReviewFields(tree).map((f) => f.id);
    assert.ok(reviewIds.includes("leak"));
  });

  it("blank tree log/review fields contain no SNN vocabulary", () => {
    const ws = createBlankTree(emptyWorkspace(), "流体力学");
    const tree = ws.trees[ws.currentTreeId!];
    const blob = JSON.stringify({ log: treeLogFields(tree), review: treeReviewFields(tree) });
    assert.equal(/ANN|ECE|Temperature Scaling|test leakage|膜电位|脉冲/i.test(blob), false);
  });

  it("snn leak detector is template runtime, not core", () => {
    const risky = {
      title: "test 拟合",
      linkedNodeIds: ["F10"],
      custom: { noTestLeak: false },
    } as never;
    const safe = {
      title: "test 拟合",
      linkedNodeIds: ["F10"],
      custom: { noTestLeak: true },
    } as never;
    assert.equal(snnLogHasRisk(risky), true);
    assert.equal(snnLogHasRisk(safe), false);
  });
});

describe("import generic tree", () => {
  it("does not force SNN template onto a custom tree", () => {
    const ws = mergeTreeIntoWorkspace(emptyWorkspace(), {
      id: "math-1",
      title: "高等数学",
      description: "分析",
      templateId: "blank",
      sections: [{ id: "sec-1", title: "极限", description: "", order: 0 }],
      nodes: [],
      reviews: {},
      logs: [],
      settings: { logFields: [], reviewFields: [] },
    });
    const tree = ws.trees["math-1"];
    assert.equal(tree.title, "高等数学");
    assert.equal(tree.templateId, "blank");
    assert.equal(tree.sections[0].title, "极限");
    assert.equal(treeLogFields(tree).length, 0);
  });

  it("export filename uses the tree title", () => {
    assert.equal(filenameForTree("SNN"), "SNN-knowledge-tree.json");
    assert.equal(filenameForTree("流体力学"), "流体力学-knowledge-tree.json");
    const ws = createBlankTree(emptyWorkspace(), "流体力学");
    const json = JSON.parse(exportTree(ws, ws.currentTreeId!));
    assert.equal(json.schemaVersion, 3);
    assert.equal(json.tree.title, "流体力学");
  });
});
