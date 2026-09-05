/** Short curriculum codes (A01, F10) stay visible; generated uids do not. */
export function isCurriculumId(id: string): boolean {
  return /^[A-Za-z]\d{2,3}$/.test(id);
}

export function nodeLabel(node: { id: string; title: string }): string {
  return isCurriculumId(node.id) ? `${node.id} ${node.title}` : node.title;
}

export const PRIO_FLOWER = { 0: "梅", 1: "兰", 2: "竹", 3: "菊" } as const;

export function prioLabel(priority: 0 | 1 | 2 | 3): string {
  return `P${priority} ${PRIO_FLOWER[priority]}`;
}
