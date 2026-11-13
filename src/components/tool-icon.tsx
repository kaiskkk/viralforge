import { CalendarDays, Dna, ScanLine, type LucideProps } from "lucide-react";

import type { ToolId } from "@/lib/tools";

const ICONS = {
  clone: Dna,
  antidropoff: ScanLine,
  series: CalendarDays,
} satisfies Record<ToolId, unknown>;

export function ToolIcon({ tool, ...props }: { tool: ToolId } & LucideProps) {
  const Icon = ICONS[tool];
  return <Icon aria-hidden {...props} />;
}
