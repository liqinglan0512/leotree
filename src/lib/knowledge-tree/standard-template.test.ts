import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseImport } from "./migrate.ts";
import { exportTree } from "./storage.ts";
import { validateTree } from "./validation.ts";
import { addNode, addSection, patchSection } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import type { Workspace } from "./types.ts";

const templateUrl = new URL("../../../templates/standard-empty-knowledge-tree.json", import.meta.url);
const templateText = readFileSync(templateUrl, "utf8");

function importTemplate() {
  const trees = parseImport(JSON.parse(templateText));
  assert.equal(trees.length, 1);
  return trees[0];
}

function workspaceWith(treeId: string, tree: ReturnType<typeof importTemplate>): Workspace {
  return { ...emptyWorkspace(), currentTreeId: treeId, trees: { [treeId]: tree } };
}

describe("standard empty template", () => {
  it("matches the exportTree single-tree envelope and validates cleanly", () => {
    const raw = JSON.parse(templateText) as { schemaVersion: number; tree: unknown };
    assert.equal(raw.schemaVersion, 3);
    const result = validateTree(raw.tree);
    assert.deepEqual(result.issues, []);
    assert.equal(result.valid, true);
  });

  it("imports as a completely empty tree with complete history", () => {
    const tree = importTemplate();
    assert.equal(tree.sections.length, 0);
    assert.equal(tree.nodes.length, 0);
    assert.equal(tree.logs.length, 0);
    assert.deepEqual(tree.reviews, {});
    assert.equal(tree.templateId, null);
    assert.equal(tree.historyComplete, true);
    assert.deepEqual(tree.learningHistory, []);
  });

  it("contains no SNN sample residue", () => {
    const banned = [/snn/i, /\bLIF\b/i, /neuron/i, /spiking/i, /膜电位/, /神经动力学/, /脉冲/, /校准/];
    for (const pattern of banned) assert.equal(pattern.test(templateText), false, `residue: ${pattern}`);
  });

  it("round-trips through export and re-import unchanged", () => {
    const tree = importTemplate();
    const ws = workspaceWith(tree.id, tree);
    const exported = exportTree(ws, tree.id);
    const again = parseImport(JSON.parse(exported));
    assert.equal(again.length, 1);
    assert.equal(again[0].sections.length, 0);
    assert.equal(again[0].nodes.length, 0);
    assert.equal(again[0].historyComplete, true);
    assert.equal(again[0].templateId, null);
  });

  it("supports section and node creation plus rename after import", () => {
    const tree = importTemplate();
    let ws = workspaceWith(tree.id, tree);
    ws = addSection(ws, "基础数学");
    const section = ws.trees[tree.id].sections[0];
    assert.equal(section.title, "基础数学");
    ws = patchSection(ws, section.id, { title: "数值分析" });
    assert.equal(ws.trees[tree.id].sections[0].title, "数值分析");
    ws = addNode(ws, section.id);
    assert.equal(ws.trees[tree.id].nodes.length, 1);
    const exported = exportTree(ws, tree.id);
    const again = parseImport(JSON.parse(exported));
    assert.equal(again[0].sections.length, 1);
    assert.equal(again[0].nodes.length, 1);
  });
});
