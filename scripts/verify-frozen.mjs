import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

const base="v1.0.0-rc.1";
const paths=execFileSync("git",["ls-tree","-r","--name-only",base,"--","src/lib/knowledge-tree"],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const files=paths.map(path=>{
  const baseline=hash(execFileSync("git",["show",`${base}:${path}`]));
  const current=hash(fs.readFileSync(path));
  return {path,baseline,current,unchanged:baseline===current};
});
const report={baseline:base,scope:"Every existing knowledge-tree file, byte-for-byte. New UI tests are additions, not baseline mutations.",status:files.every(f=>f.unchanged)?"PASS":"FAIL",count:files.length,files};
fs.writeFileSync("release-evidence/beta-frozen-core.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:report.status,count:report.count}));
if(report.status!=="PASS")process.exitCode=1;
