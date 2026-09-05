import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const scripts=readdirSync("scripts").filter(n=>n.endsWith(".test.mjs")).sort().map(n=>`scripts/${n}`);
const helpers=["src/lib/app-data/app-data.test.ts","src/lib/auth/gate-identity.test.ts","src/lib/auth/sign-in-gate.test.ts"];
const result=spawnSync(process.execPath,["--experimental-strip-types","--test",...scripts,...helpers],{stdio:"inherit"});
process.exit(result.status ?? 1);
