/**
 * Stable domain surface for the Knowledge Tree Engine.
 *
 * UI (and a future Leo AI adapter) should call these functions.
 * Do not drive the product through DOM queries or raw localStorage.
 * Storage is an adapter: swap localStorageAdapter later without
 * rewriting tree / review / log logic.
 */
export {
  loadWorkspace,
  persistWorkspace,
  exportWorkspace,
  exportTree,
  filenameForTree,
  localStorageAdapter,
  memoryAdapter,
} from "./storage.ts";
export type { StorageAdapter } from "./storage.ts";

export {
  currentTree,
  setCurrentTree,
  createBlankTree,
  createTreeFromTemplate,
  renameTree,
  duplicateTree,
  deleteTree,
  cycleNodeStatus,
  patchNode,
  addSection,
  patchSection,
  moveSection,
  deleteSection,
  addNode,
  deleteNode,
  moveNode,
  moveNodeToSection,
  setNodeParent,
  focusNode,
  focusParent,
  patchReview,
  addLog,
  patchLog,
  deleteLog,
  shiftWeek,
  patchUi,
  resetCurrentTreeProgress,
} from "./engine.ts";

export { migrateToV3, migrateV2ToTree, mergeWorkspaces, mergeTreeIntoWorkspace } from "./migrate.ts";
export { getTemplate, TEMPLATES } from "./templates/index.ts";
export { progressOf, weekSummary, buildWeekDraft } from "./progress.ts";
