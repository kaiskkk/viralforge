import { ExternalLink, Eye, Info, MessageSquareQuote, Scissors } from "lucide-react";

import { VideoThumbnail } from "@/components/dashboard/results/video-thumbnail";
import { SingleRetentionChart } from "@/components/retention-report";
import { ShootButton } from "@/components/dashboard/shoot-button";
import { ToolIcon } from "@/components/tool-icon";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { BlueprintOutput, VideoSource } from "@/lib/tools";
import { analyzeRetention } from "@/lib/retention";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "@/lib/video-url";
import { formatDuration, speakingSeconds } from "@/lib/viral-score";

const PHASE_COLORS = ["bg-accent", "bg-warn", "bg-sky-400", "bg-fuchsia-400", "bg-orange-400", "bg-teal-300"];

function scoreTone(score: number) {
  if (score >= 75) return { text: "text-accent", bar: "bg-accent" };
  if (score >= 55) return { text: "text-warn", bar: "bg-warn" };
  return { text: "text-danger", bar: "bg-danger" };
}

/** D'où vient l'analyse : dit clairement ce que le site a pu lire de la vidéo. */
function SourceNote({ source }: { source: VideoSource }) {
  const platform = source.platform ? PLATFORM_LABELS[source.platform] : null;

  if (source.status === "oembed") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        {source.thumbnailUrl && <VideoThumbnail src={source.thumbnailUrl} />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-faint">Analysé à partir de</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-fg">« {source.title ?? "Sans titre"} »</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[source.author, platform].filter(Boolean).join(" · ")}
          </p>
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-fg"
            aria-label="Ouvrir la vidéo d'origine"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
    );
  }

  return (
    <p className="flex gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-[13px] leading-relaxed text-muted">
      <Info className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
      {source.status === "link"
        ? `${platform ?? "La plateforme"} ne communique pas les informations de cette vidéo : le plan s'appuie sur ta niche et sur les formats qui marchent sur ${platform ?? "cette plateforme"}.`
        : "Sans lien de vidéo : le plan s'appuie sur les formats qui marchent dans ta niche."}
    </p>
  );
}

export function BlueprintResult({
  output,
  actions,
}: {
  output: BlueprintOutput;
  /** Actions supplémentaires de la carte du script (ex. Sauvegarder). */
  actions?: React.ReactNode;
}) {
  const tone = scoreTone(output.viralScore);
  const seconds = speakingSeconds(output.script);
  const retention = analyzeRetention(output.script);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Score et psychologie */}
        <Card className="flex flex-col">
          <CardHeader eyebrow="Potentiel viral estimé" title={output.title} />
          <div className="flex flex-1 flex-col gap-5 px-5 py-5 sm:px-6">
            <div>
              <p className="flex items-baseline gap-1.5">
                <span className={cn("text-6xl font-semibold tabular-nums tracking-tight", tone.text)} data-testid="blueprint-score">
                  {output.viralScore}
                </span>
                <span className="text-lg text-faint">/ 100</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${output.viralScore}%` }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-faint">Pourquoi ça marche</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fg">{output.whyItWorks}</p>
            </div>
            {output.triggers.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Déclencheurs psychologiques">
                {output.triggers.map((trigger) => (
                  <li key={trigger} className="rounded-full border border-accent/25 bg-accent/[0.07] px-3 py-1 text-xs text-accent">
                    {trigger}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto">
              <SourceNote source={output.source} />
            </div>
          </div>
        </Card>

        {/* Script prêt à tourner */}
        <Card className="flex flex-col border-accent/20">
          <CardHeader
            eyebrow={`Script prêt à tourner · ≈ ${formatDuration(seconds)} à l'oral`}
            title="Ton script, adapté à ta niche"
          />
          <p className="flex-1 whitespace-pre-wrap px-5 py-5 text-[15px] leading-[1.75] sm:px-6" data-testid="blueprint-script">
            {output.script}
          </p>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-4 sm:px-6">
            <CopyButton text={output.script} label="Copier le script" variant="primary" />
            <ShootButton script={output.script} title={output.title} />
            {actions}
          </div>
        </Card>
      </div>

      {retention && (
        <Card>
          <CardHeader
            eyebrow="Courbe de rétention estimée de ce script"
            title={`${retention.finalRetention} % de spectateurs encore là à la fin`}
          />
          <div className="px-3 py-4 sm:px-5">
            <SingleRetentionChart analysis={retention} height={180} />
          </div>
        </Card>
      )}

      {/* Découpage seconde par seconde */}
      <Card>
        <CardHeader eyebrow="Découpage seconde par seconde" title={`${output.timeline.length} étapes, du hook à l'appel à l'action`} />
        <ol className="divide-y divide-white/[0.06]">
          {output.timeline.map((step, index) => (
            <li key={`${step.time}-${index}`} className="grid gap-3 px-5 py-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:px-6">
              <div className="flex items-center gap-2.5 sm:block">
                <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
                  <span className={cn("size-2 rounded-full", PHASE_COLORS[index % PHASE_COLORS.length])} aria-hidden />
                  {step.time}
                </span>
                <p className="text-sm font-semibold sm:mt-1.5">{step.phase}</p>
              </div>
              <dl className="space-y-2.5 text-[13px] leading-relaxed">
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 shrink-0 text-faint">
                    <MessageSquareQuote className="size-3.5" aria-label="Dit" />
                  </dt>
                  <dd className="text-[14px] font-medium text-fg">« {step.spoken} »</dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 shrink-0 text-faint">
                    <Eye className="size-3.5" aria-label="À l'écran" />
                  </dt>
                  <dd className="text-muted">{step.visual}</dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 shrink-0 text-faint">
                    <Scissors className="size-3.5" aria-label="Montage" />
                  </dt>
                  <dd className="text-muted">{step.editing}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </Card>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-faint">
        <ToolIcon tool="blueprint" className="size-3.5" />
        Le score est une estimation du format, pas une prédiction de vues.
      </p>
    </div>
  );
}
