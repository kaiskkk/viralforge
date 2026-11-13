import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ToolIcon } from "@/components/tool-icon";
import { TOOLS, type ToolId } from "@/lib/tools";
import { formatDate } from "@/lib/utils";

export type SavedScriptSummary = {
  id: string;
  tool: ToolId;
  title: string;
  created_at: string;
};

/** Ligne cliquable vers un script sauvegardé. `trailing` reçoit une action (ex. supprimer). */
export function SavedScriptRow({
  script,
  trailing,
}: {
  script: SavedScriptSummary;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-muted">
        <ToolIcon tool={script.tool} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/saved/${script.id}`}
          className="block truncate text-sm font-medium after:absolute after:inset-0"
        >
          {script.title}
        </Link>
        <p className="mt-0.5 text-xs text-faint">
          {TOOLS[script.tool].shortName} · {formatDate(script.created_at)}
        </p>
      </div>
      {/* z-10 : l'action reste cliquable au-dessus du lien étendu à toute la ligne. */}
      {trailing && <div className="relative z-10">{trailing}</div>}
      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </li>
  );
}
