import assert from "node:assert/strict";
import { test } from "node:test";
import { addNode, createBlankTree } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { memoryBlobStore } from "./files.ts";
import { ACTIVE_KEY, encodeRecord, loadWorkspace, memoryAdapter, type StorageAdapter } from "./storage.ts";
import { memoryExclusive, WorkspaceService } from "./service.ts";

function setup() {
  const ws = addNode(createBlankTree(emptyWorkspace(), "A"), "sec-1");
  const adapter = memoryAdapter({ [ACTIVE_KEY]: encodeRecord(ws,1) });
  const blobs = memoryBlobStore(); const exclusive = memoryExclusive();
  const make = () => new WorkspaceService({ adapter,blobs,exclusive,delay: 60000 });
  return { ws,adapter,blobs,make,a: make(),b: make(), treeId: ws.currentTreeId!, nodeId: ws.trees[ws.currentTreeId!].nodes[0].id };
}
test("F01: A creates a tree, stale B search/tab never writes domain", async () => {
  const {a,b,adapter,treeId} = setup(); const before = adapter.read(ACTIVE_KEY);
  b.bind(b.getSnapshot().workspace)("patchUi",{treeQuery: "query"});
  assert.equal(adapter.read(ACTIVE_KEY),before);
  a.bind(a.getSnapshot().workspace)("createBlankTree","new tree"); assert.equal(await a.flush(),true);
  b.bind(b.getSnapshot().workspace)("patchUi",{tab: "log"});
  assert.equal(Object.keys(loadWorkspace(adapter).trees).length,2);
  assert.ok(loadWorkspace(adapter).trees[treeId]);
});
test("F01: two stale tabs safely rebase different fields, same-field changes CONFLICT", async () => {
  const {a,b,adapter,treeId,nodeId} = setup();
  a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note: "A note"});
  b.bind(b.getSnapshot().workspace)("patchNode",nodeId,{title: "B title"});
  assert.deepEqual(await Promise.all([a.flush(),b.flush()]),[true,true]);
  let node = loadWorkspace(adapter).trees[treeId].nodes[0];
  assert.equal(node.note,"A note"); assert.equal(node.title,"B title");
  await a.refresh(); await b.refresh();
  a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note: "A second"});
  b.bind(b.getSnapshot().workspace)("patchNode",nodeId,{note: "B second"});
  assert.deepEqual(await Promise.all([a.flush(),b.flush()]),[true,false]);
  node = loadWorkspace(adapter).trees[treeId].nodes[0]; assert.equal(node.note,"A second");
  assert.equal(b.getSnapshot().errorCode,"CONFLICT");
  assert.equal(b.getSnapshot().workspace.trees[treeId].nodes[0].note,"B second");
});
test("F01: old content callback cannot overwrite a newer note", async () => {
  const {a,adapter,treeId,nodeId} = setup(); const old = a.bind(a.getSnapshot().workspace);
  old("patchNode",nodeId,{note: "new knowledge"}); await a.flush();
  old("patchNode",nodeId,{note: "stale callback"});
  assert.equal(a.getSnapshot().errorCode,"CONFLICT");
  assert.equal(loadWorkspace(adapter).trees[treeId].nodes[0].note,"new knowledge");
});
test("F01: upload racing note edits and tree switch keeps explicit (treeId,nodeId)", async () => {
  const {a,adapter,treeId,nodeId,blobs} = setup();
  const upload = a.addFiles(treeId,nodeId,[new File(["attachment"],"notes.md")]);
  a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note: "written while uploading"});
  a.bind(a.getSnapshot().workspace)("createBlankTree","B");
  assert.equal(await upload,true); await a.flush();
  const saved = loadWorkspace(adapter);
  const node = saved.trees[treeId].nodes[0];
  assert.equal(node.note,"written while uploading");
  assert.equal(node.attachments?.length,1);
  assert.equal(await (await blobs.get(node.attachments![0].id))!.text(),"attachment");
  assert.equal(a.getSnapshot().workspace.trees[a.getSnapshot().workspace.currentTreeId!].title,"B");
});
test("F01: delete races upload completion without resurrecting node or orphan bytes", async () => {
  const {a,b,treeId,nodeId,blobs,adapter} = setup();
  b.bind(b.getSnapshot().workspace)("deleteNode",nodeId); await b.flush();
  assert.equal(await a.addFiles(treeId,nodeId,[new File(["late"],"late.md")]),false);
  assert.equal(loadWorkspace(adapter).trees[treeId].nodes.length,0);
  assert.deepEqual(await blobs.keys(),[]);
  assert.equal(a.getSnapshot().errorCode,"CONFLICT");
});
test("F06: independent tree bytes survive deleting copied attachment", async () => {
  const {a,treeId,nodeId,blobs,adapter} = setup();
  await a.addFiles(treeId,nodeId,[new File(["original bytes"],"proof.md")]);
  const originalId = loadWorkspace(adapter).trees[treeId].nodes[0].attachments![0].id;
  assert.equal(await a.copyTree(treeId),true);
  const copyId = a.getSnapshot().workspace.currentTreeId!;
  const copiedFile = a.getSnapshot().workspace.trees[copyId].nodes[0].attachments![0].id;
  assert.notEqual(copyId,treeId); assert.notEqual(copiedFile,originalId);
  assert.equal(await (await blobs.get(copiedFile))!.text(),"original bytes");
  a.removeFile(copyId,nodeId,copiedFile); await a.flush();
  assert.equal(await (await blobs.get(originalId))!.text(),"original bytes");
  // One validated last-good checkpoint owns the old bytes until the next commit.
  a.bind(a.getSnapshot().workspace)("renameTree",copyId,"copy without files"); await a.flush();
  assert.equal(await blobs.get(copiedFile),null);
  assert.equal(await (await blobs.get(originalId))!.text(),"original bytes");
});
test("F08: quota failure retains draft, no false saved, retry persists", async () => {
  const base = setup(); let fail = true;
  const adapter: StorageAdapter = { ...base.adapter, write: (k,v) => { if (fail) throw new DOMException("full","QuotaExceededError"); base.adapter.write(k,v); } };
  const a = new WorkspaceService({ adapter, blobs: base.blobs, exclusive: memoryExclusive(),delay: 60000 });
  a.bind(a.getSnapshot().workspace)("patchNode",base.nodeId,{note: "rescue this"});
  assert.equal(await a.flush(),false); assert.equal(a.getSnapshot().status,"SAVE_FAILED");
  assert.equal(a.getSnapshot().workspace.trees[base.treeId].nodes[0].note,"rescue this");
  assert.equal(loadWorkspace(base.adapter).trees[base.treeId].nodes[0].note,"");
  fail = false; assert.equal(await a.retry(),true);
  assert.equal(loadWorkspace(base.adapter).trees[base.treeId].nodes[0].note,"rescue this");
});
test("F08: IndexedDB failure retains attachment metadata and rescue bytes, not unsupported-type error", async () => {
  const base = setup(); const broken = { ...base.blobs, putMany: async () => { throw new Error("IDB aborted"); } };
  const a = new WorkspaceService({ adapter: base.adapter, blobs: broken, exclusive: memoryExclusive(),delay: 60000 });
  assert.equal(await a.addFiles(base.treeId,base.nodeId,[new File(["survive"],"rescue.md")]),false);
  assert.equal(a.getSnapshot().status,"SAVE_FAILED"); assert.equal(a.getSnapshot().errorCode,"STORAGE_ERROR");
  const metadata = a.getSnapshot().workspace.trees[base.treeId].nodes[0].attachments![0];
  assert.equal(await a.rescueBytes().get(metadata.id)!.text(),"survive");
  assert.equal(loadWorkspace(base.adapter).trees[base.treeId].nodes[0].attachments?.length,0);
});
test("F01/F08: coalesced text changes and structural operations replay stable IDs", async () => {
  const {a,adapter,treeId,nodeId} = setup(); let writes = 0;
  const write = adapter.write; adapter.write = (k,v) => { if (k === ACTIVE_KEY) writes++; write(k,v); };
  for (const note of ["n","no","not","note"]) a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note});
  a.bind(a.getSnapshot().workspace)("addNode","sec-1",nodeId);
  const child = a.getSnapshot().workspace.trees[treeId].nodes.at(-1)!;
  a.bind(a.getSnapshot().workspace)("patchNode",child.id,{title: "child"});
  assert.equal(await a.flush(),true);
  assert.equal(writes,1); assert.equal(loadWorkspace(adapter).trees[treeId].nodes.at(-1)!.id,child.id);
});
test("F08: serialization failure precedes writes and preserves rescueable draft", async () => {
  const {a,adapter,treeId,nodeId} = setup(); const before=adapter.read(ACTIVE_KEY);
  a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note:"serialization rescue"});
  const original=JSON.stringify;
  JSON.stringify=((value:unknown,...args:unknown[])=>{
    if(value && typeof value==="object" && "formatVersion" in value) throw new TypeError("Injected serialization failure");
    return (original as (...args:any[])=>string)(value,...args);
  }) as typeof JSON.stringify;
  try {assert.equal(await a.flush(),false);} finally {JSON.stringify=original;}
  assert.equal(adapter.read(ACTIVE_KEY),before);
  assert.equal(JSON.parse(JSON.stringify(a.getSnapshot().workspace)).trees[treeId].nodes[0].note,"serialization rescue");
  assert.equal(a.getSnapshot().status,"SAVE_FAILED");
  assert.equal(await a.retry(),true);
});
test("F05: command replay preserves reset null timestamps and notes", async () => {
  const {a,adapter,treeId,nodeId}=setup();
  a.bind(a.getSnapshot().workspace)("patchNode",nodeId,{note:"retain"});
  a.bind(a.getSnapshot().workspace)("setNodeStatus",nodeId,"doing");await a.flush();
  a.bind(a.getSnapshot().workspace)("resetCurrentTreeProgress");assert.equal(await a.flush(),true);
  const node=loadWorkspace(adapter).trees[treeId].nodes[0];
  assert.equal(node.statusChangedAt,null);assert.equal(node.firstSeenDoingAt,null);assert.equal(node.note,"retain");
});
