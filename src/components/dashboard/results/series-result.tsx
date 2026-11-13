"use client";

import { CornerDownRight } from "lucide-react";
import { useState } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { SeriesOutput } from "@/lib/tools";
import { cn } from "@/lib/utils";

function seriesAsText(output: SeriesOutput): string {
  return output.episodes
    .map((episode) => `JOUR ${episode.day} — ${episode.title}\n\n${episode.script}`)
    .join("\n\n———\n\n");
}

export function SeriesResult({
  output,
  actions,
}: {
  output: SeriesOutput;
  /** Actions supplémentaires de l'en-tête (ex. bouton Sauvegarder). */
  actions?: React.ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const episode = output.episodes[selected];
  const next = output.episodes[selected + 1];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          eyebrow="Série 7 jours"
          title={output.seriesTitle}
          actions={
            <>
              <CopyButton text={seriesAsText(output)} label="Copier la série" />
              {actions}
            </>
          }
        />
        <p className="px-5 py-4 text-sm leading-relaxed text-muted sm:px-6">{output.arc}</p>
      </Card>

      {/* Frise des 7 jours */}
      <div className="scrollbar-none flex items-center overflow-x-auto py-1" role="tablist" aria-label="Épisodes">
        {output.episodes.map((item, index) => (
          <div key={item.day} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-label={`Jour ${item.day} : ${item.title}`}
              onClick={() => setSelected(index)}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full font-mono text-xs transition-colors",
                selected === index
                  ? "bg-accent font-semibold text-black"
                  : "hairline bg-surface text-muted hover:border-white/[0.2] hover:text-fg",
              )}
            >
              J{item.day}
            </button>
            {index < output.episodes.length - 1 && (
              <span className="h-px min-w-3 flex-1 bg-white/[0.1]" aria-hidden />
            )}
          </div>
        ))}
      </div>

      {episode && (
        <Card key={episode.day} className="animate-fade-up" role="tabpanel">
          <CardHeader
            eyebrow={`Jour ${episode.day}`}
            title={episode.title}
            actions={<CopyButton text={episode.script} />}
          />
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-faint">Hook</p>
              <p className="mt-1.5 text-lg font-semibold leading-snug tracking-tight">{episode.hook}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-faint">Script</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.75]">{episode.script}</p>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-4">
              <p className="text-[11px] uppercase tracking-widest text-accent">
                {next ? `Cliffhanger vers le jour ${next.day}` : "Ouverture finale"}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{episode.cliffhanger}</p>
              {next && (
                <button
                  type="button"
                  onClick={() => setSelected(selected + 1)}
                  className="mt-3 flex items-center gap-2 text-left text-[13px] text-muted transition-colors hover:text-fg"
                >
                  <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    Jour {next.day} : {next.title}
                  </span>
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
