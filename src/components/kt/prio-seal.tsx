import { PRIO_FLOWER, prioLabel } from "@/lib/knowledge-tree/display";
import type { Priority } from "@/lib/knowledge-tree/types";

export function PrioSeal({ priority }: { priority: Priority }) {
  return (
    <span className={`seal p${priority}`} title={prioLabel(priority)} aria-label={prioLabel(priority)}>
      <b>{PRIO_FLOWER[priority]}</b>
      <i>P{priority}</i>
    </span>
  );
}
