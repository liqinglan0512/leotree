/** Public account support is opt-in; a process-memory preview is not an account store. */
export function emailAuthConfigured(env: Record<string,string | undefined>): boolean {
  if (env.VITE_AUTH_ENABLED === "false" || env.LEOTREE_EMAIL_AUTH !== "true") return false;
  const persistent = env.DATABASE_URL?.trim() || env.LEOTREE_PGLITE_PATH?.trim();
  if (!persistent || /^(memory|idb):/i.test(persistent)) return false;
  if ((env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) return false;
  try {
    const url=new URL(env.BETTER_AUTH_URL ?? "");
    return (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}
