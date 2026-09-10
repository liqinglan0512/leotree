import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const directories = ["src/lib", "src/lib/knowledge-tree"];
const files = directories
  .flatMap((directory) => readdirSync(directory).filter(name => name.endsWith(".test.ts")).map(name => `${directory}/${name}`))
  .sort();
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
