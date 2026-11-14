import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { HooksOutput } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { scoreHookLine } from "@/lib/viral-score";

function scoreTone(score: number) {
  if (score >= 75) return "text-accent";
  if (score >= 55) return "text-warn";
  return "text-danger";
}

/**
 * Les accroches, classées par force. Le score vient du critère « Hook » du
 * simulateur : le même calcul, instantané et identique pour tout le monde.
 */
export function HooksResult({
  output,
  actions,
}: {
  output: HooksOutput;
  actions?: React.ReactNode;
}) {
  const ranked = output.hooks
    .map((hook) => ({ ...hook, ...scoreHookLine(hook.text) }))
    .sort((a, b) => b.score - a.score);
  const allText = ranked.map((hook, index) => `${index + 1}. ${hook.text}`).join("\n");

  return (
    <Card>
      <CardHeader
        eyebrow="Labo à hooks"
        title={`${ranked.length} accroches, de la plus forte à la plus faible`}
        actions={
          <>
            <CopyButton text={allText} label="Tout copier" />
            {actions}
          </>
        }
      />
      <ol className="divide-y divide-white/[0.06]">
        {ranked.map((hook, index) => (
          <li key={hook.text} className="flex gap-4 px-5 py-4 sm:px-6">
            <span
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px]",
                index === 0 ? "bg-accent font-semibold text-black" : "border border-white/[0.12] text-muted",
              )}
              aria-label={`Rang ${index + 1}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug text-fg">{hook.text}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{hook.why}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="hairline rounded-full bg-white/[0.03] px-2.5 py-0.5 text-[11px] capitalize text-muted">
                  {hook.angle}
                </span>
                <span className="text-[11px] text-faint" title={hook.insight}>
                  Force{" "}
                  <span data-testid="hook-score" className={cn("font-mono font-semibold tabular-nums", scoreTone(hook.score))}>
                    {hook.score}
                  </span>
                  /100
                </span>
              </div>
            </div>
            <CopyButton text={hook.text} label="Copier" compact />
          </li>
        ))}
      </ol>
    </Card>
  );
}
