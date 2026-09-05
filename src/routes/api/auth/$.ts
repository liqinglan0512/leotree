import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { getSql } from "@/lib/db";

async function capabilities() {
  let ready = emailAndPasswordEnabled;
  if (ready) {
    try { const sql=await getSql(); await sql.query("select 1"); }
    catch { ready=false; }
  }
  return Response.json({emailPassword:ready,oauth:[]},{headers:{"cache-control":"no-store"}});
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => new URL(request.url).pathname === "/api/auth/capabilities" ? capabilities() : auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
