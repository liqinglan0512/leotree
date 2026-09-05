import { getTemplate } from "./templates/index.ts";
import type { CustomFieldDef, KnowledgeTree } from "./types.ts";

function fromSettings(value: unknown): CustomFieldDef[] | null {
  return Array.isArray(value) ? (value as CustomFieldDef[]) : null;
}

/** Log custom fields: tree snapshot first, then the originating template. */
export function treeLogFields(tree: KnowledgeTree): CustomFieldDef[] {
  return fromSettings(tree.settings?.logFields) ?? getTemplate(tree.templateId)?.logFields ?? [];
}

export function treeReviewFields(tree: KnowledgeTree): CustomFieldDef[] {
  return fromSettings(tree.settings?.reviewFields) ?? getTemplate(tree.templateId)?.reviewFields ?? [];
}
