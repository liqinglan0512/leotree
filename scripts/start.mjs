// Keep dev and the portable RC on the same origin so browser knowledge stays visible.
process.env.PORT ??= "8080";
process.env.HOST ??= "127.0.0.1";
await import("../.output/server/index.mjs");
