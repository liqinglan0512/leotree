/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off by default. Runtime configuration must provide a durable database,
 * stable secret and valid origin; the capability endpoint also probes the DB.
 * See README.md and `npm run setup:account`. This does not enable knowledge sync.
 */
import { emailAuthConfigured } from "./config";
export const emailAndPasswordEnabled = emailAuthConfigured(process.env);
