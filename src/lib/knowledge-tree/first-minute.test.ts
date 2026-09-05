import { test } from "node:test";
import assert from "node:assert/strict";
import { createTreeFromDraft } from "../create-tree-draft.ts";
import { backupAge } from "../ui-preferences.ts";
import { userMessage } from "../user-messages.ts";
import { WorkspaceService,memoryExclusive } from "./service.ts";
import { memoryAdapter,readWorkspace } from "./storage.ts";
import { memoryBlobStore } from "./files.ts";

test("Creation card composes existing commands: blank defaults and description persist together",async()=>{
  const adapter=memoryAdapter();const service=new WorkspaceService({adapter,blobs:memoryBlobStore(),exclusive:memoryExclusive(),delay:60000});
  const id=createTreeFromDraft(service,"   ","   ")!;
  assert.equal(await service.flush(),true);
  let saved=readWorkspace(adapter).workspace!;
  assert.equal(saved.trees[id].title,"未命名");assert.equal(saved.trees[id].description,"");
  const second=createTreeFromDraft(service," 中文树 "," 一段简介 ","snn-calibration")!;
  assert.equal(await service.flush(),true);saved=readWorkspace(adapter).workspace!;
  assert.equal(saved.trees[second].title,"中文树");assert.equal(saved.trees[second].description,"一段简介");
  assert.ok(saved.trees[second].nodes.length>0);assert.equal(Object.keys(saved.trees).length,2);
});
test("Backup recency handles never, invalid data, time skew and elapsed days",()=>{
  const now=Date.parse("2026-09-05T12:00:00Z");
  assert.equal(backupAge(null,now),"从未");assert.equal(backupAge("bad",now),"从未");
  assert.equal(backupAge("2026-09-06T12:00:00Z",now),"从未");
  assert.equal(backupAge("2026-09-05T11:00:00Z",now),"今天");
  assert.equal(backupAge("2026-09-02T12:00:00Z",now),"3 天前");
});
test("Storage and recovery errors offer plain language without exposing internal enums",()=>{
  for(const code of ["SAVE_FAILED","DEGRADED","RECOVERY_REQUIRED","UNKNOWN","CONFLICT","COORDINATION_UNAVAILABLE","PARSE_ERROR","STORAGE_ERROR"]) {
    const text=userMessage(code);assert.match(text,/[\u4e00-\u9fff]/);assert.ok(!text.includes(code));
  }
});
