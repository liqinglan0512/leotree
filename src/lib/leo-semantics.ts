/**
 * Leo Tree product language (frozen).
 *
 * Visible:
 *   园子     — the user's set of knowledge trees (Grove / Workspace)
 *   知识树   — one KnowledgeTree
 *   分区     — Section (keep this word; not 园圃/花坛)
 *   枝 / 枝干 — the path / local structure around the focused node
 *   节点     — Node (keep this word; not 叶子)
 *
 * Light garden verbs only: 开园 / 栽树 / 入园 / 修枝.
 * Do not add 浇水、施肥、结果、落叶、成长值, etc.
 *
 * Internal / data stay precise:
 *   KnowledgeTree, Section, Node, Status, Priority (0|1|2|3 = P0–P3),
 *   Progress, Review, PracticeLog.
 * 梅兰竹菊 are UI nicknames for P0–P3, never stored as the priority value.
 *
 * Future (not this round): tree fork / lineage may add optional
 *   sourceTreeId? / parentTreeId?
 * Skip until a real migration is needed.
 */
export {};
