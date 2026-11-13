import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-accent text-black">
        <Flame className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
      ViralForge
    </span>
  );
}
