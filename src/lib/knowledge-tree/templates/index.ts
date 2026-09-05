import type { TemplateRuntime, TreeTemplate } from "../types.ts";
import { blankTemplate } from "./blank.ts";
import { snnRuntime, snnTemplate } from "./snn.ts";

export const TEMPLATES: TreeTemplate[] = [snnTemplate, blankTemplate];

const RUNTIMES: Record<string, TemplateRuntime> = {
  [snnTemplate.id]: snnRuntime,
};

export function getTemplate(id: string | null | undefined): TreeTemplate | null {
  if (!id) return null;
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getRuntime(templateId: string | null | undefined): TemplateRuntime {
  if (!templateId) return {};
  return RUNTIMES[templateId] ?? {};
}

export { snnTemplate, blankTemplate, snnRuntime };
