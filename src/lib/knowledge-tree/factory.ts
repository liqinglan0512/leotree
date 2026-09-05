import { weekIdFromDate } from "./dates.ts";
import { nowISO, todayISO, uid } from "./ids.ts";
import { blankTemplate } from "./templates/blank.ts";
import { getTemplate } from "./templates/index.ts";
import type {
  KnowledgeNode,
  KnowledgeTree,
  LogStatus,
  PracticeLog,
  Review,
  Section,
  TreeTemplate,
  Workspace,
  WorkspaceUi,
} from "./types.ts";
import { SCHEMA_VERSION } from "./types.ts";

export function emptyUi(): WorkspaceUi {
  return {
    tab: "tree",
    editing: false,
    openNotes: {},
    expandedLogs: {},
    treeQuery: "",
    treeStatus: "",
    treePrio: "",
    weekId: weekIdFromDate(),
    logQuery: "",
    logStatus: "",
    logTag: "",
    scrollLogId: "",
    switcherOpen: false,
    focusNodeId: null,
    outlineOpen: {},
  };
}

export function emptyReview(weekId: string): Review {
  return {
    weekId,
    focus: "",
    stuck: "",
    nextMain: "",
    nextP2: "",
    risk: "",
    summary: "",
    custom: {},
    updatedAt: nowISO(),
  };
}

export function emptyLog(partial: Partial<PracticeLog> = {}): PracticeLog {
  const t = nowISO();
  return {
    id: uid("log"),
    title: "",
    date: todayISO(),
    status: "idea",
    question: "",
    hypothesis: "",
    process: "",
    conclusion: "",
    linkedNodeIds: [],
    attachmentNote: "",
    tags: [],
    custom: {},
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function instantiateTemplate(
  template: TreeTemplate,
  opts: { treeId?: string; title?: string; description?: string } = {},
): KnowledgeTree {
  const t = nowISO();
  const sections: Section[] = template.sections.map((s, i) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    order: i,
  }));
  const nodes: KnowledgeNode[] = [];
  template.sections.forEach((s, si) => {
    s.nodes.forEach((n, ni) => {
      nodes.push({
        id: n.id,
        sectionId: s.id,
        title: n.title,
        hint: n.hint,
        status: "todo",
        priority: n.priority,
        note: "",
        tags: [],
        order: ni,
        createdAt: t,
        updatedAt: t,
        statusChangedAt: null,
        statusHistory: [],
        firstSeenDoingAt: null,
        firstDoneAt: null,
        firstDoneExact: true,
        parentId: null,
        prerequisiteIds: [],
        relatedNodeIds: [],
        attachments: [],
      });
      void si;
    });
  });
  return {
    id: opts.treeId ?? uid("tree"),
    title: opts.title ?? template.title,
    description: opts.description ?? template.description,
    createdAt: t,
    updatedAt: t,
    templateId: template.id,
    sections,
    nodes,
    reviews: {},
    logs: [],
    learningHistory: [],
    historyComplete: true,
    historyCompleteSince: t,
    settings: {
      logFields: template.logFields,
      reviewFields: template.reviewFields,
    },
  };
}

export function newBlankTree(title = "未命名知识树"): KnowledgeTree {
  return instantiateTemplate(blankTemplate, { title, description: "" });
}

export function emptyWorkspace(): Workspace {
  return {
    schemaVersion: SCHEMA_VERSION,
    currentTreeId: null,
    trees: {},
    ui: emptyUi(),
  };
}

export function touchTree(tree: KnowledgeTree): KnowledgeTree {
  return { ...tree, updatedAt: nowISO() };
}

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  idea: "构思",
  running: "进行中",
  done: "完成",
  dropped: "放弃",
};

export const NODE_STATUS_LABEL = { todo: "未学", doing: "正在学", done: "掌握" } as const;
export const NODE_STATUS_MARK = { todo: "□", doing: "△", done: "✓" } as const;
export const STATUS_CYCLE: Array<KnowledgeNode["status"]> = ["todo", "doing", "done"];

export function getTemplateOrBlank(id: string | null): TreeTemplate {
  return getTemplate(id) ?? blankTemplate;
}
