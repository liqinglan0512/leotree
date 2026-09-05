import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { emailAuthConfigured } from "../auth/config.ts";

test("F09: accounts require explicit persistent configuration, secret and usable origin", () => {
  const valid={LEOTREE_EMAIL_AUTH:"true",LEOTREE_PGLITE_PATH:".local/account-db",BETTER_AUTH_SECRET:"x".repeat(64),BETTER_AUTH_URL:"http://localhost:8080"};
  assert.equal(emailAuthConfigured({}),false);
  assert.equal(emailAuthConfigured(valid),true);
  for(const patch of [{LEOTREE_EMAIL_AUTH:"false"},{VITE_AUTH_ENABLED:"false"},{LEOTREE_PGLITE_PATH:""},{LEOTREE_PGLITE_PATH:"memory://"},{BETTER_AUTH_SECRET:"short"},{BETTER_AUTH_URL:"http://example.com"},{BETTER_AUTH_URL:"https://example.com/path"}]) assert.equal(emailAuthConfigured({...valid,...patch}),false);
});

test("F14: archived SNN evidence matches its manifest; ordinary entry contains only a redirect", () => {
  const manifest=JSON.parse(readFileSync("docs/archive/manifest.json","utf8"));
  for(const [name,record] of Object.entries(manifest) as Array<[string,{sha256:string}]>) assert.equal(createHash("sha256").update(readFileSync(`docs/archive/${name}`)).digest("hex"),record.sha256);
  const entry=readFileSync("public/snn-calibration-knowledge-tree.html","utf8");
  assert.match(entry,/http-equiv="refresh"/);assert.doesNotMatch(entry,/<script|localStorage|indexedDB/);
});
