import assert from "node:assert/strict";
import { test } from "node:test";
import { createBlankTree } from "./engine.ts";
import { emptyWorkspace } from "./factory.ts";
import { ACTIVE_KEY, RAW_PREFIX, activateRecovery, encodeRecord, loadWorkspace, memoryAdapter, readWorkspace, recoveryCandidates, type StorageAdapter } from "./storage.ts";
import { migrateToV3 } from "./migrate.ts";

test("F03: corrupted/future/invalid containers retain byte-identical source, never fall back or write", () => {
  const good = createBlankTree(emptyWorkspace());
  const malformed = ["{broken", JSON.stringify({ schemaVersion: 99, trees: {} }), JSON.stringify({ ...good, trees: null }), JSON.stringify({ ...good, trees: { [good.currentTreeId!]: { ...good.trees[good.currentTreeId!], nodes: {} } } }), JSON.stringify({ ...good, currentTreeId: "missing" })];
  const expected = ["PARSE_ERROR", "UNSUPPORTED_VERSION", "SCHEMA_INVALID", "SCHEMA_INVALID", "RELATION_INVALID"];
  malformed.forEach((raw,i) => {
    const base = memoryAdapter({ "knowledge-tree-workspace-v3": raw, "snn-calib-knowledge-tree-v2": JSON.stringify({ tree: { A01: { note: "older" } } }) });
    let writes = 0; const adapter = { ...base, write: () => { writes++; } };
    assert.equal(readWorkspace(adapter).code, expected[i]);
    assert.throws(() => loadWorkspace(adapter));
    assert.equal(writes, 0); assert.equal(base.read("knowledge-tree-workspace-v3"), raw);
  });
});
test("F03: recovery candidate needs confirmation and preserves unique corrupt active envelope", () => {
  const map: Record<string,string> = { [ACTIVE_KEY]: "{lost", "snn-calib-knowledge-tree-v2": JSON.stringify({ tree: { A01: { note: "recover me" } } }) };
  const adapter: StorageAdapter = { read: k => map[k] ?? null, write: (k,v) => { map[k]=v; }, remove: k => { delete map[k]; } };
  const original = readWorkspace(adapter);
  const candidate = recoveryCandidates(adapter)[0].workspace!;
  assert.throws(() => activateRecovery(adapter, original, candidate, false), /Confirm/);
  assert.equal(map[ACTIVE_KEY], "{lost");
  activateRecovery(adapter, original, candidate, true);
  assert.equal(readWorkspace(adapter).code, "READY");
  const preserved = Object.entries(map).find(([k]) => k.startsWith(RAW_PREFIX))!;
  assert.equal(JSON.parse(preserved[1]).raw, "{lost");
  assert.equal(loadWorkspace(adapter).trees[candidate.currentTreeId!].nodes[0].note, "recover me");
});
test("F03/F08: valid read requires no writes, inaccessible storage differs from missing", () => {
  const ws = createBlankTree(emptyWorkspace()); const raw = encodeRecord(ws, 12);
  const adapter = { ...memoryAdapter({ [ACTIVE_KEY]: raw }), write: () => { throw new Error("QuotaExceededError"); } };
  assert.equal(readWorkspace(adapter).revision, 12);
  assert.equal(loadWorkspace(adapter).trees[ws.currentTreeId!].title, ws.trees[ws.currentTreeId!].title);
  assert.equal(readWorkspace({ ...adapter, read: () => { throw new Error("SecurityError"); } }).code, "STORAGE_ERROR");
  assert.equal(readWorkspace(memoryAdapter()).code, "MISSING");
});
test("F03/F04: legacy unknown nodes and original payload survive migration", () => {
  const raw = { schemaVersion: 2, tree: { A01: { note: "known" }, Z99: { note: "custom knowledge", status: "done", extra: 123 } }, other: "retain" };
  const ws = migrateToV3(raw); const tree = ws.trees[ws.currentTreeId!];
  assert.equal(tree.nodes.find(n => n.id === "Z99")?.note, "custom knowledge");
  assert.equal(tree.nodes.find(n => n.id === "Z99")?.extra, 123);
  assert.deepEqual(tree.settings.legacySource, raw);
  assert.throws(() => migrateToV3({ hello: "unrelated JSON" }), /Unrecognised/);
});
