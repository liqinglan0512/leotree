import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateToV3, migrateV2ToTree, mergeWorkspaces, mergeTreeIntoWorkspace } from "./migrate.ts";
import { loadWorkspace, memoryAdapter, persistWorkspace } from "./storage.ts";
import { progressOf } from "./progress.ts";
import { SCHEMA_VERSION } from "./types.ts";
import { createBlankTree, cycleNodeStatus } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";

const v2 = {
  schemaVersion: 2,
  tree: {
    A01: {
      status: "done",
      note: "膜电位当 logit",
      statusChangedAt: "2026-09-04T11:00:00.000Z",
      statusHistory: [{ from: "todo", to: "doing", at: "2026-09-01T00:00:00.000Z" }, { from: "doing", to: "done", at: "2026-09-04T11:00:00.000Z" }],
    },
    A02: { status: "doing", note: "" },
  },
  weeklyReviews: {
    "2026-08-31": { focus: "推进 A01", stuck: "定义", nextMain: "小 T？", nextP2: "", leak: "no", leakNote: "", draft: "草稿" },
  },
  experiments: [
    {
      id: "e-1",
      title: "leak-test",
      date: "2026-09-04",
      status: "idea",
      hypothesis: "用 test 拟合",
      linkedIds: ["F10"],
      noTestLeak: false,
      acc: "0.9",
      createdAt: "2026-09-04T10:00:00.000Z",
      updatedAt: "2026-09-04T10:00:00.000Z",
    },
  ],
};

describe("migrate v2 to v3", () => {
  it("keeps SNN node progress, notes, reviews and logs", () => {
    const ws = migrateToV3(v2);
    assert.equal(ws.schemaVersion, SCHEMA_VERSION);
    const tree = ws.trees[ws.currentTreeId!];
    assert.equal(tree.title, "SNN");
    const a01 = tree.nodes.find((n) => n.id === "A01");
    const a02 = tree.nodes.find((n) => n.id === "A02");
    assert.equal(a01?.status, "done");
    assert.equal(a01?.note, "膜电位当 logit");
    assert.equal(a01?.statusHistory?.length, 2);
    assert.equal(a02?.status, "doing");
    assert.ok(a02?.firstSeenDoingAt);
    const review = tree.reviews["2026-08-31"];
    assert.equal(review.focus, "推进 A01");
    assert.equal(review.custom.leak, "no");
    assert.equal(review.summary, "草稿");
    assert.equal(tree.logs[0].title, "leak-test");
    assert.equal(tree.logs[0].custom.noTestLeak, false);
    assert.deepEqual(tree.logs[0].linkedNodeIds, ["F10"]);
    assert.ok(tree.nodes.some((n) => n.id === "E12"));
    assert.ok(tree.nodes.some((n) => n.id === "F10"));
  });

  it("does not invent this-week completion for untimestamped done nodes", () => {
    const tree = migrateV2ToTree({ tree: { A01: { status: "done", note: "" } } });
    const a01 = tree.nodes.find((n) => n.id === "A01")!;
    assert.equal(a01.status, "done");
    assert.equal(a01.statusChangedAt, null);
  });
});

describe("storage adapter", () => {
  it("loads v2 without overwriting or writing any source", () => {
    const adapter = memoryAdapter({ "snn-calib-knowledge-tree-v2": JSON.stringify(v2) });
    const ws = loadWorkspace(adapter);
    assert.equal(ws.schemaVersion, 3);
    assert.equal(ws.trees[ws.currentTreeId!].nodes.find((n) => n.id === "A01")?.note, "膜电位当 logit");
    assert.equal(adapter.read("knowledge-tree-workspace-v3"), null);
    assert.equal(adapter.read("snn-calib-knowledge-tree-v2"), JSON.stringify(v2));
  });

  it("roundtrips workspace", () => {
    const adapter = memoryAdapter();
    const ws = createBlankTree(emptyWorkspace(), "高等数学");
    persistWorkspace(ws, adapter);
    const loaded = loadWorkspace(adapter);
    assert.equal(loaded.trees[loaded.currentTreeId!].title, "高等数学");
    assert.equal(loaded.trees[loaded.currentTreeId!].templateId, "blank");
  });
});

describe("progress and isolation", () => {
  it("weighted progress treats doing as 0.4", () => {
    const p = progressOf([
      { status: "done" } as never,
      { status: "doing" } as never,
      { status: "todo" } as never,
    ]);
    assert.equal(p.pct, 47);
    assert.equal(p.done, 1);
  });

  it("two trees do not share node status", () => {
    let ws = createBlankTree(emptyWorkspace(), "A");
    const idA = ws.currentTreeId!;
    ws = createBlankTree(ws, "B");
    const idB = ws.currentTreeId!;
    assert.notEqual(idA, idB);
    const nodeB = ws.trees[idB].nodes[0];
    if (nodeB) ws = cycleNodeStatus(ws, nodeB.id);
    assert.equal(ws.trees[idA].title, "A");
    assert.equal(ws.trees[idB].title, "B");
  });
});

describe("merge", () => {
  it("keeps unknown fields", () => {
    const a = migrateToV3(v2);
    const b = migrateToV3({
      schemaVersion: 3,
      currentTreeId: a.currentTreeId,
      trees: {
        [a.currentTreeId!]: {
          ...a.trees[a.currentTreeId!],
          extra: "keep-me",
        },
      },
      ui: a.ui,
    });
    const merged = mergeWorkspaces(a, b);
    assert.equal((merged.trees[merged.currentTreeId!] as { extra?: string }).extra, "keep-me");
  });
});

describe("tree export import", () => {
  it("accepts nested exportTree shape without forcing SNN", () => {
    const incoming = {
      schemaVersion: 3,
      tree: {
        id: "math-1",
        title: "高等数学",
        description: "",
        templateId: "blank",
        sections: [{ id: "sec-1", title: "极限", description: "", order: 0 }],
        nodes: [],
        reviews: {},
        logs: [],
        settings: { logFields: [], reviewFields: [] },
      },
    };
    const merged = mergeTreeIntoWorkspace(emptyWorkspace(), incoming);
    assert.equal(merged.trees[merged.currentTreeId!].title, "高等数学");
    assert.equal(merged.trees[merged.currentTreeId!].templateId, "blank");
  });
});

describe("ui hydration", () => {
  it("maps lab tab from v2 onto log", () => {
    const ws = migrateToV3({ schemaVersion: 2, tree: { A01: { status: "todo" } }, ui: { tab: "lab" } });
    assert.equal(ws.ui.tab, "log");
  });
});
