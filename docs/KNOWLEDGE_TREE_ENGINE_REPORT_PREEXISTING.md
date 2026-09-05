# Knowledge Tree Engine — 本轮报告

SNN 校准知识树已从「整个应用」降级为通用 Knowledge Tree Engine 中的第一棵树 / 第一套模板。本地优先，无账号、无云、无 LLM。

---

## 1. 本轮架构变化摘要

原先产品是单文件 HTML + 把 `/` 跳转到该 HTML。SNN 的章节、实验字段、泄漏检测、storage key、导出文件名都写在应用核心里。

现在分成四层：

| 层 | 职责 | 现在的实现 |
|---|---|---|
| Data model | Workspace / Tree / Section / Node / Review / PracticeLog / Template / CustomField | `src/lib/knowledge-tree/types.ts` |
| Storage adapter | 读写、可替换 | `storage.ts`（localStorage / memory） |
| Domain service | 树 CRUD、状态循环、周回顾、日志、迁移 | `engine.ts` `migrate.ts` `progress.ts` |
| UI | 米纸视觉、三个页签、结构编辑、切换器 | `src/components/kt/*` |

SNN 专有内容只留在 `templates/snn.ts`（节点文案 + 日志/回顾 custom fields + `snnRuntime.logHasRisk`）。

Header 绑定**当前树**：默认 SNN 树标题是三个字母「SNN」，简介来自 tree metadata，不再出现圆形「校」logo，也不再把「SNN 校准知识树」当产品总标题。

---

## 2. 新的数据模型

`schemaVersion = 3`  
storage key：`knowledge-tree-workspace-v3`

```
Workspace
  schemaVersion: 3
  currentTreeId
  trees: { [id]: KnowledgeTree }
  ui

KnowledgeTree
  id, title, description
  createdAt, updatedAt
  templateId
  sections: Section[]
  nodes: KnowledgeNode[]
  reviews: { [weekId]: Review }
  logs: PracticeLog[]
  settings                // 快照 logFields / reviewFields

Section
  id, title, description, order

KnowledgeNode
  id, sectionId, title, hint
  status: todo | doing | done
  priority: 0 | 1 | 2
  note, tags, order
  createdAt, updatedAt
  statusChangedAt, statusHistory (last 20)
  firstSeenDoingAt
  parentId, prerequisiteIds, relatedNodeIds   // 预留，本轮不画图

Review          // 通用周回顾
  weekId
  focus / stuck / nextMain / nextP2 / risk / summary
  custom        // 模板字段，例如 SNN 的 leak

PracticeLog     // 通用实践日志
  title, date, status
  question, hypothesis, process, conclusion
  linkedNodeIds, attachmentNote, tags
  custom        // 模板字段，例如 SNN 的 T / ECE / noTestLeak
```

未知字段在迁移 / merge 时保留，不静默丢。

---

## 3. SNN-specific 内容现在放在哪里

全部在 `src/lib/knowledge-tree/templates/snn.ts`：

- 模板 id：`snn-calibration`
- 标题：`SNN`
- 简介：`脉冲神经网络 · 校准与时间维可靠性`
- A–F 六区、69 个节点（含 E12 temporal calibration、F10 data leakage）
- `logFields`：models / readouts / T / dt / calibrator / ECE / noTestLeak 等
- `reviewFields`：是否发生数据泄漏风险
- `snnRuntime.logHasRisk`：F10 或文案含 test/泄漏/测试集，且未勾选 noTestLeak

实例化时这些字段快照进 `tree.settings`，UI 通过 `treeLogFields()` / `treeReviewFields()` 读取，**不**在核心或 UI 里硬编码 ANN / ECE / Temperature Scaling。

空白模板 `templates/blank.ts` 的 logFields / reviewFields 为空数组。

---

## 4. 旧数据如何迁移

读取顺序：

1. `knowledge-tree-workspace-v3`（若已是新格式，hydrate 后写回）
2. 旧 key：`snn-calib-knowledge-tree-v2` 以及若干 v1 别名
3. 都没有 → 空 workspace（新用户看到「新建空白 / 从 SNN 示例 / 导入」）

v2 → 一棵 `title = "SNN"` 的树：

- 节点进度 / 笔记 / statusHistory 按 id（A01…）覆盖模板节点
- `weeklyReviews` → `reviews`；`leak` 进入 `custom`
- `experiments` → `logs`，SNN 字段进入 `custom`
- 旧 tab `lab` 映射为 `log`（`review` → `week`）
- 旧 key **不删**，新写入只用 v3

已验证：本机 v2 自动迁出 69 节点、A01 ✓ + 笔记「膜电位当 logit」、A02 △、leak-test 日志（风险未确认）、周回顾泄漏字段。

---

## 5. 新增了哪些用户操作

知识树管理（克制弹层，不是 Dashboard）：

- 切换 / 新建空白 / 从 SNN 模板创建 / 改名 / 复制 / 删除 / 导入 JSON
- 导出当前树（`SNN-knowledge-tree.json`）
- 导出整个 workspace（`knowledge-tree-workspace.json`）

结构编辑（学习态默认隐藏，点「编辑结构」才出现）：

- Section：新增、改名、改描述、上移/下移、删除
- Node：新增、改标题/摘要、P0–P2、换分区、上移/下移、删除、笔记、□/△/✓

实践日志与周回顾改为通用引擎 + 模板字段。空白树不会出现 SNN 词汇。

---

## 6. 为 Leo AI 留下的接口边界

本轮 **没有** 接 Leo AI / LLM / 云 / 账号。

稳定入口：`src/lib/knowledge-tree/api.ts`（`knowledgeTreeApi`）

将来 adapter 只调这些函数，不要操作 DOM 或解析 HTML：

- `loadWorkspace` / `persistWorkspace`（换 storage adapter 即可换后端）
- `createBlankTree` / `createTreeFromTemplate` / `renameTree` / `duplicateTree` / `deleteTree` / `setCurrentTree`
- `addSection` / `patchSection` / `moveSection` / `deleteSection`
- `addNode` / `patchNode` / `moveNode` / `moveNodeToSection` / `deleteNode` / `cycleNodeStatus`
- 节点上已有 `parentId` / `prerequisiteIds` / `relatedNodeIds`
- `addLog` / `patchLog` / `deleteLog`
- `patchReview` / `weekSummary` / `progressOf`
- `migrateToV3` / `mergeWorkspaces` / `mergeTreeIntoWorkspace`

---

## 7. 修改 / 新增的主要文件

新增：

- `src/lib/knowledge-tree/` — types, engine, factory, migrate, storage, progress, dates, ids, display, fields, api, templates/{snn,blank,index}
- `src/components/kt/knowledge-app.tsx` `custom-fields.tsx`
- `src/lib/knowledge-tree/migrate.test.ts` `engine.test.ts`

改动：

- `src/routes/index.tsx` — 直接渲染 `KnowledgeApp`（`ssr: false`）
- `src/routes/__root.tsx` — 文档标题改为「知识树」
- `src/styles.css` — 保留米纸视觉，补切换器/弹层
- `vite.config.ts` — 去掉把 `/` 指到旧 HTML 的插件
- `src/lib/og/site.json` — title `知识树`
- `public/favicon.svg` — 树枝标记，去掉「校」
- `package.json` test script 纳入知识树测试

保留：`public/snn-calibration-knowledge-tree.html` 作为旧原型存档，不再作为首页。  
分享图 `public/og.jpg` / `public/x-banner.jpg` 仍是你喜欢的有字版本。

---

## 8. build / lint / typecheck / test 结果

| 检查 | 结果 |
|---|---|
| `tsc --noEmit` | 通过 |
| eslint（知识树 + 路由 + UI） | 通过 |
| 单元测试 | 17 passed / 0 failed（迁移、隔离、SNN 字段、空白树无 SNN 词、导出文件名、tab 映射） |
| `npm run build` | 通过 |
| 浏览器 console | 无未捕获错误 |
| 生产包 smoke | 通过（新用户落地页，无 overflow） |

---

## 9. 桌面截图

见同目录 `desktop.png` / `snn-tree.png`：标题只有 **SNN**，简介来自 metadata，A–F 节点卡、□/△/✓、P0、加权进度仍在。A01 迁移后为掌握。

## 10. 手机截图

见 `mobile.png`：390 宽，统计两列，卡片不横溢，主按钮可点。

另：`week.png` 周回顾（SNN 树仍有泄漏字段）；`blank-edit.png` 空白树结构编辑，无 ANN/ECE。

---

## 11. 尚未解决的问题

1. **页签是 workspace 级**，不是每棵树一份。切树后会停在刚才的「周回顾 / 实践日志」。
2. 排序是 ↑↓，没有拖拽（按本轮约束）。
3. `parentId` / 依赖边只在数据模型里，没有图画。
4. 新浏览器档案看到的是空落地页，不会自动塞一棵 SNN；有旧 v2 的用户会自动进 SNN。
5. 分享大图仍带 SNN 字样（你点名喜欢）。无字版本另放，没有替换线上卡片。
6. 旧 HTML 仍可从原路径打开，和新引擎不同步。

---

## 12. 下一轮最多 3 个建议

1. **把 tab / 筛选状态收到每棵树**，切树不再串页签。
2. **再做 1–2 套非 SNN 模板**（高等数学、流体力学），用来压测 custom fields 是否真的通用。
3. **给 `knowledgeTreeApi` 写一个空的 Leo AI adapter 接口**（不接网、不接模型），只规定「推荐下一节点 / 从回顾生成日志」怎么读 workspace。

---

## 验收 Gate

| Gate | 结果 |
|---|---|
| 1 旧 v2 自动迁移，进度/笔记/周回顾/日志不丢 | 通过 |
| 2 新用户可建完全不含 SNN 语义的空白树 | 通过 |
| 3 可建/改/删/排序 Section 与 Node | 通过 |
| 4 至少两棵树可切换且状态不污染 | 通过 |
| 5 SNN A–F 完整（69 节点，含 E12 / F10） | 通过 |
| 6 SNN 实验字段来自 template custom fields | 通过 |
| 7 空白树 UI 不出现 ANN / ECE / Temperature Scaling / test leakage | 通过 |
| 8 周回顾、进度、状态、笔记、日志关联仍工作 | 通过 |
| 9 单树 JSON 与 Workspace JSON 可导出/导入 | 通过（含单测） |
| 10 刷新后保持 | 通过（v3 localStorage） |
| 11 桌面 / 手机无明显破坏 | 通过 |
| 12 build / typecheck / lint / 测试通过 | 通过 |
