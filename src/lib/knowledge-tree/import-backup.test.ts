import assert from "node:assert/strict";
import { test } from "node:test";
import { unzipSync,zipSync } from "fflate";
import { addNode,addLog,patchNode,patchReview,createBlankTree,setNodeStatus } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { ACTIVE_KEY,encodeRecord,memoryAdapter,loadWorkspace } from "./storage.ts";
import { memoryBlobStore } from "./files.ts";
import { WorkspaceService,memoryExclusive } from "./service.ts";
import { previewImport } from "./import.ts";
import { createBackup,readBackup,previewBackupRestore,sha256 } from "./backup.ts";
function fixture() {
  let ws = addNode(createBlankTree(emptyWorkspace(),"notes"),"sec-1");
  const treeId = ws.currentTreeId!; const nodeId = ws.trees[treeId].nodes[0].id;
  ws = patchNode(ws,nodeId,{note: "current valuable knowledge"});
  ws = setNodeStatus(ws,nodeId,"done");
  ws = addLog(ws,{title: "practice",linkedNodeIds:[nodeId],conclusion:"evidence"});
  ws = patchReview(ws,"2026-08-31",{summary:"reflect"});
  const adapter = memoryAdapter({[ACTIVE_KEY]:encodeRecord(ws,1)}); const blobs = memoryBlobStore();
  const service = new WorkspaceService({adapter,blobs,exclusive:memoryExclusive(),delay:60000});
  return {ws,treeId,nodeId,adapter,blobs,service};
}
test("F02: default import is independent and leaves newer original untouched", async () => {
  const {ws,treeId,service,adapter} = fixture();
  const old = structuredClone(ws.trees[treeId]); old.nodes[0].note="old"; old.nodes[0].updatedAt="2020-01-01T00:00:00Z";
  const preview = await previewImport(service,{schemaVersion:3,tree:old});
  assert.ok(preview.conflicts.some(c => c.kind === "older"));
  assert.notEqual(preview.workspace.currentTreeId,treeId);
  const raw = adapter.read(ACTIVE_KEY);
  assert.equal(await service.acceptPreview(preview,false),false); assert.equal(adapter.read(ACTIVE_KEY),raw);
  // Explicit retry after a rejected confirmation does not change the preview.
  await service.discardDraft(true);
  assert.equal(await service.acceptPreview(preview,true),true);
  const restored = loadWorkspace(adapter); assert.equal(Object.keys(restored.trees).length,2);
  assert.equal(restored.trees[treeId].nodes[0].note,"current valuable knowledge");
});
test("F02: restore/merge require explicit collision choice and stale previews conflict", async () => {
  const {ws,treeId,nodeId,service,adapter} = fixture();
  const old = structuredClone(ws.trees[treeId]); old.nodes[0].note="old";
  await assert.rejects(() => previewImport(service,old,"restore"),/explicitly/);
  const merge = await previewImport(service,old,"merge");
  assert.equal(merge.workspace.trees[treeId].nodes[0].note,"current valuable knowledge");
  const restore = await previewImport(service,old,"restore",{preferIncoming:true});
  service.bind(service.getSnapshot().workspace)("patchNode",nodeId,{note:"changed after preview"}); await service.flush();
  assert.equal(await service.acceptPreview(restore,true),false);
  assert.equal(loadWorkspace(adapter).trees[treeId].nodes[0].note,"changed after preview");
});
test("F02/F04: section mismatch, duplicate IDs, cycles and unrelated imports are rejected before writes", async () => {
  const {ws,treeId,service,adapter} = fixture(); const tree = ws.trees[treeId]; const before=adapter.read(ACTIVE_KEY);
  for (const invalid of [{...tree,sections:[]},{...tree,nodes:[...tree.nodes,...tree.nodes]},{...tree,nodes:tree.nodes.map(n=>({...n,parentId:n.id}))},{hello:"world"}]) {
    await assert.rejects(()=>previewImport(service,invalid)); assert.equal(adapter.read(ACTIVE_KEY),before);
  }
});
test("F01/F02: legacy source changes at revision zero still invalidate an import preview", async () => {
  const {ws,treeId}=fixture();const adapter=memoryAdapter({"knowledge-tree-workspace-v3":JSON.stringify(ws)});
  const service=new WorkspaceService({adapter,blobs:memoryBlobStore(),exclusive:memoryExclusive(),delay:60000});
  const preview=await previewImport(service,ws.trees[treeId]);
  const changed=structuredClone(ws);changed.trees[treeId].nodes[0].note="changed by old client";
  adapter.write("knowledge-tree-workspace-v3",JSON.stringify(changed));
  assert.equal(await service.acceptPreview(preview,true),false);
  assert.equal(adapter.read(ACTIVE_KEY),null);
  assert.equal(loadWorkspace(adapter).trees[treeId].nodes[0].note,"changed by old client");
});
test("F07: full ZIP → empty storage → restore keeps all knowledge, metadata and byte hashes", async () => {
  const {service,adapter,treeId,nodeId} = fixture();
  await service.addFiles(treeId,nodeId,[new File(["attachment one"],"one.md"),new File(["%PDF-1.7\nexample"],"two.pdf")]);
  const original=loadWorkspace(adapter); const zip=await createBackup(service);
  const emptyAdapter=memoryAdapter(); const emptyBlobs=memoryBlobStore();
  const target=new WorkspaceService({adapter:emptyAdapter,blobs:emptyBlobs,exclusive:memoryExclusive(),delay:60000});
  const preview=await readBackup(zip,0);
  assert.equal(preview.manifest.attachmentCount,2); assert.equal(preview.manifest.counts.trees,1);
  assert.equal(await target.acceptPreview(preview,true),true);
  const restored=loadWorkspace(emptyAdapter);
  assert.deepEqual(restored.trees,original.trees);
  assert.equal(restored.currentTreeId,original.currentTreeId);
  for (const a of original.trees[treeId].nodes[0].attachments!) {
    const source=await service.blobs.get(a.id); const dest=await emptyBlobs.get(a.id);
    assert.ok(source && dest);
    assert.equal(await sha256(new Uint8Array(await source.arrayBuffer())),await sha256(new Uint8Array(await dest.arrayBuffer())));
  }
  // Restoring over occupied IDs stages independent bytes, never mutates the originals.
  const again=await previewBackupRestore(target,zip);
  assert.notEqual(again.files[0][0],preview.files[0][0]);
  assert.equal(await target.acceptPreview(again,true),true);
});
test("F07: retained garden snapshots/covers also roundtrip atomically", async () => {
  const {service,adapter,blobs} = fixture();
  await blobs.putMany([["cover-1",new Blob(["cover bytes"],{type:"image/png"})]]);
  const raw=JSON.stringify({gardens:[{id:"g",art:"cover:cover-1"}],planted:[],comments:[{body:"legacy local note"}]});
  adapter.write("leo-tree-gardens-v1",raw);
  const preview=await readBackup(await createBackup(service),0);
  const target=new WorkspaceService({adapter:memoryAdapter(),blobs:memoryBlobStore(),exclusive:memoryExclusive(),delay:60000});
  assert.equal(await target.acceptPreview(preview,true),true);
  assert.equal(target.getSnapshot().workspace.retainedGardenData,raw);
  assert.equal(await (await target.blobs.get("cover-1"))!.text(),"cover bytes");
});
test("F07: corrupt or incomplete ZIP fails before any activation", async () => {
  const {service} = fixture(); const zip=await createBackup(service); const archive=unzipSync(zip);
  archive["workspace.json"][0] ^= 1;
  await assert.rejects(()=>readBackup(zipSync(archive),0),/Corrupt|hash/);
  delete archive["workspace.json"];
  await assert.rejects(()=>readBackup(zipSync(archive),0));
});
test("F08: rescue ZIP preserves an uncommitted attachment when IndexedDB rejects storage", async () => {
  const {adapter,treeId,nodeId,blobs} = fixture();
  const broken={...blobs,putMany:async()=>{throw new Error("transaction failed");}};
  const service=new WorkspaceService({adapter,blobs:broken,exclusive:memoryExclusive(),delay:60000});
  assert.equal(await service.addFiles(treeId,nodeId,[new File(["unsaved bytes"],"rescue.md")]),false);
  const rescue=await readBackup(await createBackup(service,true),0);
  assert.equal(rescue.manifest.rescue,true);
  assert.equal(await rescue.files[0][1].text(),"unsaved bytes");
  assert.equal(rescue.workspace.trees[treeId].nodes[0].attachments!.length,1);
});
