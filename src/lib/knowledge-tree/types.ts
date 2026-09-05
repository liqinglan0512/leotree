export const SCHEMA_VERSION = 3 as const;
export const STORAGE_KEY_V3 = "knowledge-tree-workspace-v3";
export const STORAGE_KEYS_V2 = [
  "snn-calib-knowledge-tree-v2",
  "snn-calib-knowledge-tree",
  "snn-calib-knowledge-tree-v1",
  "snn-calibration-knowledge-tree",
  "snn-calibration-knowledge-tree-v1",
] as const;

export type NodeStatus = "todo" | "doing" | "done";
export type Priority = 0 | 1 | 2 | 3;
export type LogStatus = "idea" | "running" | "done" | "dropped";
export type AppTab = "tree" | "week" | "log";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio";

export interface FieldOption {
  value: string;
  label: string;
}

export interface CustomFieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  placeholder?: string;
  group?: string;
}

export interface StatusChange {
  from: string;
  to: string;
  at: string;
}

export interface KnowledgeNode {
  id: string;
  sectionId: string;
  title: string;
  hint: string;
  status: NodeStatus;
  priority: Priority;
  note: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string | null;
  statusHistory: StatusChange[];
  firstSeenDoingAt: string | null;
  parentId?: string | null;
  prerequisiteIds?: string[];
  relatedNodeIds?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    kind: "png" | "md" | "pdf" | "docx";
    size: number;
    addedAt: string;
  }>;
  [key: string]: unknown;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  [key: string]: unknown;
}

export interface Review {
  weekId: string;
  focus: string;
  stuck: string;
  nextMain: string;
  nextP2: string;
  risk: string;
  summary: string;
  custom: Record<string, unknown>;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PracticeLog {
  id: string;
  title: string;
  date: string;
  status: LogStatus;
  question: string;
  hypothesis: string;
  process: string;
  conclusion: string;
  linkedNodeIds: string[];
  attachmentNote: string;
  tags: string[];
  custom: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface KnowledgeTree {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  templateId: string | null;
  sections: Section[];
  nodes: KnowledgeNode[];
  reviews: Record<string, Review>;
  logs: PracticeLog[];
  settings: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkspaceUi {
  tab: AppTab;
  editing: boolean;
  openNotes: Record<string, boolean>;
  expandedLogs: Record<string, boolean>;
  treeQuery: string;
  treeStatus: "" | NodeStatus;
  treePrio: "" | "0" | "1" | "2" | "3";
  weekId: string;
  logQuery: string;
  logStatus: "" | LogStatus;
  logTag: string;
  scrollLogId: string;
  switcherOpen: boolean;
  focusNodeId: string | null;
  outlineOpen: Record<string, boolean>;
}

export interface Workspace {
  schemaVersion: typeof SCHEMA_VERSION;
  currentTreeId: string | null;
  trees: Record<string, KnowledgeTree>;
  ui: WorkspaceUi;
  [key: string]: unknown;
}

export interface TemplateSectionSeed {
  id: string;
  title: string;
  description: string;
  nodes: Array<{
    id: string;
    title: string;
    hint: string;
    priority: Priority;
  }>;
}

export interface TreeTemplate {
  id: string;
  title: string;
  description: string;
  sections: TemplateSectionSeed[];
  logFields: CustomFieldDef[];
  reviewFields: CustomFieldDef[];
}

export interface TemplateRuntime {
  logHasRisk?: (log: PracticeLog) => boolean;
  reviewRiskHint?: (logs: PracticeLog[]) => string | null;
}
