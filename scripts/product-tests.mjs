import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const directory = "src/lib/knowledge-tree";
const files = readdirSync(directory).filter(name => name.endsWith(".test.ts")).sort().map(name => `${directory}/${name}`);
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
