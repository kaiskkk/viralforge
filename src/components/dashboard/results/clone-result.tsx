import { ArrowDown } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { CloneOutput } from "@/lib/tools";
import { cn } from "@/lib/utils";

const BEAT_COLORS = [
  "bg-accent",
  "bg-warn",
  "bg-sky-400",
  "bg-fuchsia-400",
  "bg-orange-400",
  "bg-teal-300",
];

export function CloneResult({
  output,
  actions,
}: {
  output: CloneOutput;
  /** Actions supplémentaires de l'en-tête (ex. bouton Sauvegarder). */
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          eyebrow="Nouveau script"
          title={output.title}
          actions={
            <>
              <CopyButton text={output.script} />
              {actions}
            </>
          }
        />
        <p className="whitespace-pre-wrap px-5 py-5 text-[15px] leading-[1.75] sm:px-6">
          {output.script}
        </p>
      </Card>

      <Card>
        <CardHeader eyebrow="Structure clonée" title={`${output.beats.length} battements, dans le même ordre`} />
        <p className="border-b border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-muted sm:px-6">
          {output.structureSummary}
        </p>
        <ol className="divide-y divide-white/[0.06]">
          {output.beats.map((beat, index) => (
            <li key={index} className="px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn("size-2 shrink-0 rounded-full", BEAT_COLORS[index % BEAT_COLORS.length])}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold tracking-tight">
                  <span className="mr-2 font-mono text-xs font-normal text-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {beat.label}
                </h3>
              </div>
              <p className="mt-1.5 pl-[18px] text-[13px] leading-relaxed text-muted">{beat.trigger}</p>

              <div className="mt-4 space-y-2 pl-[18px]">
                <blockquote className="rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed text-muted">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-faint">Source</span>
                  {beat.sourceExcerpt}
                </blockquote>
                <ArrowDown className="ml-3.5 size-3.5 text-faint" aria-hidden />
                <blockquote className="rounded-lg border border-accent/20 bg-accent/[0.05] px-3.5 py-2.5 text-[13px] leading-relaxed text-fg">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-accent">Ton script</span>
                  {beat.newText}
                </blockquote>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
