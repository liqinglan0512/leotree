import assert from "node:assert/strict";
import { test } from "node:test";
import { addNode, createBlankTree, deleteNode, focusNode, patchNode, patchUi, resetCurrentTreeProgress } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { applyOperation, prepareOperation } from "./operations.ts";
import { doneIncrement, firstDoneAt, weekSummary } from "./progress.ts";
import { migrateToV3 } from "./migrate.ts";
import { assertTree } from "./validation.ts";
import type { NodeStatus, Workspace } from "./types.ts";

const fixture = () => { const ws = createBlankTree(emptyWorkspace()); return addNode(ws,ws.trees[ws.currentTreeId!].sections[0].id); };
const treeOf = (ws: Workspace) => ws.trees[ws.currentTreeId!];
function change(ws: Workspace, status: NodeStatus, at: string) {
  const op = prepareOperation(ws,["setNodeStatus",treeOf(ws).nodes[0].id,status]); op.at = at;
  const next = applyOperation(ws,op);
  assert.deepEqual(applyOperation(ws,op),next,"replay must preserve immutable event identity and timestamps");
  return next;
}

test("F12: first completion and old-week facts survive 20-history trim, rename, reset and deletion", () => {
  let ws = fixture(); const id = treeOf(ws).nodes[0].id;
  ws = patchNode(ws,id,{ title: "Original learning fact" });
  ws = change(ws,"done","2026-08-04T12:00:00.000Z");
  for (let i=0;i<42;i++) ws = change(ws,i%2 ? "done" : "doing",`2026-08-25T12:00:${String(i).padStart(2,"0")}.000Z`);
  assert.equal(treeOf(ws).nodes[0].statusHistory.length,20);
  assert.equal(firstDoneAt(treeOf(ws).nodes[0]),"2026-08-04T12:00:00.000Z");
  assert.equal(doneIncrement(treeOf(ws),2026,7),1);
  ws = patchNode(ws,id,{ title: "Today's different title", priority: 0 });
  ws = resetCurrentTreeProgress(ws);
  const old = weekSummary(treeOf(ws),"2026-08-03");
  assert.equal(old.newlyDone[0].title,"Original learning fact");
  assert.equal(old.newlyDone[0].priority,1);
  assert.equal(doneIncrement(treeOf(ws),2026,7),1);
  ws = deleteNode(ws,id);
  assert.equal(weekSummary(treeOf(ws),"2026-08-03").newlyDone[0].exists,false);
  assert.equal(doneIncrement(treeOf(ws),2026,7),1);
  assertTree(treeOf(ws));
});

test("F12: partial legacy evidence is UNKNOWN, never known zero; current diagnostics ignore chosen week", () => {
  const ws = migrateToV3({ schemaVersion:2,tree:{ A01:{status:"doing"},A02:{status:"doing",statusChangedAt:"2026-01-01T00:00:00.000Z"} } });
  const t = treeOf(ws), summary = weekSummary(t,"2026-08-03");
  assert.equal(summary.historyKnown,false);
  assert.equal(doneIncrement(t,2026,7),null);
  assert.equal(summary.unknownDoing,1);
  assert.equal(summary.stalled.length,1);
  assert.equal(weekSummary(t,"2099-08-03").stalled.length,1);
});

test("F03/F12: repeated v2 reads are deterministic and preserve all available status events", () => {
  const raw = { schemaVersion:2, tree:{ A01:{status:"done",statusHistory:Array.from({length:24},(_,i)=>({from:"doing",to:"done",at:`2026-08-04T12:00:${String(i).padStart(2,"0")}.000Z`}))} },experiments:[{title:"No generated id"}] };
  const a = migrateToV3(raw), b = migrateToV3(raw);
  assert.deepEqual(a,b);
  assert.equal(treeOf(a).learningHistory?.length,24);
  assert.equal(treeOf(a).nodes[0].firstDoneExact,false);
});

test("F10: search drilldown clears overlay and adding under active filters exposes the new node", () => {
  let ws = fixture(); const t=treeOf(ws), id=t.nodes[0].id;
  ws=patchUi(ws,{treeQuery:"text",treeStatus:"done",treePrio:"0"});
  ws=focusNode(ws,id); assert.equal(ws.ui.treeQuery,""); assert.equal(ws.ui.focusNodeId,id);
  const op=prepareOperation(ws,["addNode",t.sections[0].id,id]);
  ws=applyOperation(ws,op);
  assert.equal(ws.ui.treeStatus,""); assert.equal(ws.ui.treePrio,"");
  assert.equal(treeOf(ws).nodes.find(n=>n.id===ws.ui.focusNodeId)?.parentId,id);
});

test("F10: practice draft captures the source node and opens even with old log filters", () => {
  let ws=fixture(); const id=treeOf(ws).nodes[0].id;
  ws=patchUi(ws,{logQuery:"invisible",logStatus:"done"});
  ws=applyOperation(ws,prepareOperation(ws,["addLog",{title:"Practice",linkedNodeIds:[id]}]));
  assert.deepEqual(treeOf(ws).logs[0].linkedNodeIds,[id]);
  assert.equal(ws.ui.tab,"log"); assert.equal(ws.ui.logQuery,""); assert.equal(ws.ui.logStatus,"");
});
