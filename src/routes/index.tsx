import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeApp } from "@/components/kt/knowledge-app";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <KnowledgeApp />;
}
