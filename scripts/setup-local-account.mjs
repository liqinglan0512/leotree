import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
// Exclusive creation preserves any existing local configuration and secret.
const config = ["LEOTREE_EMAIL_AUTH=true", "LEOTREE_PGLITE_PATH=.local/account-db", "BETTER_AUTH_URL=http://localhost:8080", `BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}`, "PORT=8080", "HOST=127.0.0.1", ""].join("\n");
try { writeFileSync(".env.local",config,{flag:"wx",mode:0o600}); }
catch(error) { if(error.code === "EEXIST") { console.error(".env.local already exists; it was not changed.");process.exit(1); } throw error; }
console.log("Local account configuration created. Restart the server. The knowledge workspace remains in the browser; keep .env.local and .local/account-db private.");
