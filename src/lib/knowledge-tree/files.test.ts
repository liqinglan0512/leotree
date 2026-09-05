import assert from "node:assert/strict";
import {test} from "node:test";
import {indexedDB} from "fake-indexeddb";
import { indexedBlobStore,memoryBlobStore,prepareFile,MAX_FILE_BYTES,validateFile } from "./files.ts";
import {CoverDraft} from "./cover-draft.ts";
import {memoryExclusive} from "./service.ts";
test("F06/F08: IndexedDB batch atomicity and immutable IDs prevent partial bytes writes", async () => {
  Object.defineProperty(globalThis,"indexedDB",{value:indexedDB,configurable:true});
  await indexedBlobStore.putMany([["original",new Blob(["keep"])]]);
  await assert.rejects(()=>indexedBlobStore.putMany([["staged",new Blob(["new"])],["original",new Blob(["overwrite"])]]));
  assert.equal(await indexedBlobStore.get("staged"),null);
  assert.equal(await (await indexedBlobStore.get("original"))!.text(),"keep");
  await indexedBlobStore.deleteMany(["original"]);
  assert.deepEqual(await indexedBlobStore.keys(),[]);
});
test("F06: cancelled cover draft and cancelled async completion leave zero blobs", async () => {
  const png=new File([new Uint8Array([137,80,78,71,13,10,26,10])],"cover.png");
  const blobs=memoryBlobStore(); const draft=new CoverDraft();
  await draft.select(png); draft.cancel(); assert.deepEqual(await blobs.keys(),[]);
  await draft.select(png); let called=false;
  const cancelling={...blobs,putMany:async(entries:Array<[string,Blob]>)=>{await blobs.putMany(entries);draft.cancel();}};
  assert.equal(await draft.save(()=>{called=true;},cancelling,memoryExclusive()),false);
  assert.equal(called,false); assert.deepEqual(await blobs.keys(),[]);
});
test("F08: unsupported bytes differ from storage error, exact 10 MiB boundary", async () => {
  assert.equal(validateFile(new File([new Uint8Array(MAX_FILE_BYTES)],"limit.md")).ok,true);
  assert.deepEqual(validateFile(new File([new Uint8Array(MAX_FILE_BYTES+1)],"too-big.md")),{ok:false,error:"size"});
  await assert.rejects(()=>prepareFile(new File(["<html>not a PNG"],"fake.png")),{code:"FILE_UNSUPPORTED"});
  await assert.rejects(()=>prepareFile(new File(["jpg"],"no.jpg")),{code:"FILE_UNSUPPORTED"});
});
