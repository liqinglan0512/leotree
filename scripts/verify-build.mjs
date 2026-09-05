import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";

// Reject accidental resolution through a source checkout's parent node_modules.
const root = resolve(process.env.RC_SERVER_ROOT || ".output");
const server = realpathSync(join(root, "server"));
assert.equal(JSON.parse(readFileSync(join(root, "nitro.json"), "utf8")).preset, "node-server");
assert.ok(existsSync(join(server, "index.mjs")));
assert.ok(statSync(join(root, "public")).isDirectory());
const resolver = createRequire(join(server, "package.json"));
const contained = path => {
  const rel = relative(server, realpathSync(path));
  assert.ok(rel !== ".." && !rel.startsWith("..\\") && !rel.startsWith("../") && !isAbsolute(rel), `Runtime dependency escaped build: ${path}`);
};
for (const name of ["@electric-sql/pglite", "tslib"]) contained(resolver.resolve(name));
const packageRoot = join(server, "node_modules", "@electric-sql", "pglite");
const files = ["pglite.wasm", "initdb.wasm", "pglite.data"].map(name => {
  const path = join(packageRoot, "dist", name); contained(path);
  const bytes = readFileSync(path); assert.ok(bytes.length > 1000, `Truncated ${name}`);
  if (name.endsWith(".wasm")) assert.deepEqual([...bytes.subarray(0, 4)], [0, 97, 115, 109]);
  return { path: relative(root, path).replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
});
console.log(JSON.stringify({ status: "PASS", preset: "node-server", selfContainedDependencies: true, files }, null, 2));
