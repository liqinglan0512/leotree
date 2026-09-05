import type { TreeTemplate } from "../types.ts";

export const BLANK_TEMPLATE_ID = "blank";

export const blankTemplate: TreeTemplate = {
  id: BLANK_TEMPLATE_ID,
  title: "空白知识树",
  description: "",
  sections: [
    {
      id: "sec-1",
      title: "未命名分区",
      description: "先写这个领域要拆成哪几块。",
      nodes: [],
    },
  ],
  logFields: [],
  reviewFields: [],
};
