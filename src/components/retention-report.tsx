"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

import { RetentionChart, type RetentionMarker } from "@/components/retention-chart";
import type { RetentionAnalysis, RiskLevel } from "@/lib/retention";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/viral-score";

export const LEVELS = {
  ok: { label: "Retient", icon: CircleCheck, text: "text-accent", border: "border-l-accent/60", bg: "" },
  warn: { label: "À surveiller", icon: CircleAlert, text: "text-warn", border: "border-l-warn", bg: "bg-warn/[0.05]" },
  drop: { label: "Décrochage", icon: TriangleAlert, text: "text-danger", border: "border-l-danger", bg: "bg-danger/[0.06]" },
} satisfies Record<RiskLevel, { label: string; icon: typeof CircleCheck; text: string; border: string; bg: string }>;

export function retentionMarkers(analysis: RetentionAnalysis): RetentionMarker[] {
  return analysis.sentences
    .filter((sentence) => sentence.level === "drop")
    // Au milieu de la phrase : c'est pendant qu'elle est dite que les gens partent.
    .map((sentence) => ({ second: Math.round((sentence.start + sentence.end) / 2), label: sentence.reason ?? "Décrochage probable" }));
}

/** La phrase dite à une seconde donnée, pour l'infobulle du graphique. */
export function sentenceAt(analysis: RetentionAnalysis) {
  return (second: number) =>
    analysis.sentences.find((sentence) => second < sentence.end)?.text ?? analysis.sentences[analysis.sentences.length - 1]?.text ?? null;
}

export function retentionTone(value: number) {
  if (value >= 50) return "text-accent";
  if (value >= 25) return "text-warn";
  return "text-danger";
}

/** Chiffres clés de la courbe. */
export function RetentionStats({ analysis }: { analysis: RetentionAnalysis }) {
  const risky = analysis.sentences.filter((sentence) => sentence.level !== "ok").length;
  const stats = [
    { label: "À la fin", value: `${analysis.finalRetention} %`, tone: retentionTone(analysis.finalRetention), testId: "retention-final" },
    { label: "Rétention moyenne", value: `${analysis.averageRetention} %`, tone: "text-fg" },
    { label: "Durée à l'oral", value: formatDuration(analysis.durationSeconds), tone: "text-fg" },
    { label: "Phrases à risque", value: String(risky), tone: risky ? "text-warn" : "text-accent" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-surface px-4 py-3.5">
          <dt className="text-[11px] uppercase tracking-widest text-faint">{stat.label}</dt>
          <dd className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", stat.tone)} data-testid={stat.testId}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Le script phrase par phrase, coloré selon le risque, avec la raison. */
export function SentenceList({ analysis }: { analysis: RetentionAnalysis }) {
  return (
    <ol className="space-y-2" aria-label="Phrases du script">
      {analysis.sentences.map((sentence, index) => {
        const level = LEVELS[sentence.level];
        const Icon = level.icon;
        return (
          <li
            key={`${index}-${sentence.text}`}
            className={cn("rounded-xl border border-l-[3px] border-white/[0.06] px-4 py-3", level.border, level.bg)}
            data-level={sentence.level}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] tabular-nums text-faint">{Math.round(sentence.start)} s</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-relaxed text-fg">{sentence.text}</p>
                {sentence.reason && <p className="mt-1 text-[13px] leading-relaxed text-muted">{sentence.reason}</p>}
              </div>
              <span className={cn("flex shrink-0 items-center gap-1 text-[11px] font-medium", level.text)}>
                <Icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{level.label}</span>
                <span className="sr-only sm:hidden">{level.label}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Graphique d'une seule courbe, avec les moments à risque marqués. */
export function SingleRetentionChart({ analysis, height, label = "Courbe de rétention estimée" }: { analysis: RetentionAnalysis; height?: number; label?: string }) {
  return (
    <RetentionChart
      label={label}
      height={height}
      series={[{ id: "script", label: "Ton script", points: analysis.curve, tone: "accent" }]}
      markers={retentionMarkers(analysis)}
      describe={sentenceAt(analysis)}
    />
  );
}

/** Deux courbes : le script d'origine et sa réécriture. */
export function BeforeAfterRetention({ before, after }: { before: RetentionAnalysis; after: RetentionAnalysis }) {
  const gain = after.finalRetention - before.finalRetention;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-2 font-semibold tabular-nums tracking-tight">
          <span className={cn("text-2xl", retentionTone(before.finalRetention))}>{before.finalRetention} %</span>
          <span className="text-faint" aria-hidden>→</span>
          <span className={cn("text-3xl", retentionTone(after.finalRetention))} data-testid="retention-after">
            {after.finalRetention} %
          </span>
        </p>
        <p className="pb-1 text-[13px] text-muted">
          {gain > 0
            ? `de spectateurs encore là à la fin : +${gain} points avec la réécriture.`
            : "de spectateurs encore là à la fin, selon la forme du texte."}
        </p>
      </div>
      <RetentionChart
        label="Courbe de rétention estimée, avant et après réécriture"
        series={[
          { id: "before", label: "Ton script", points: before.curve, tone: "muted" },
          { id: "after", label: "Réécrit", points: after.curve, tone: "accent" },
        ]}
        markers={retentionMarkers(after)}
        describe={sentenceAt(after)}
      />
    </div>
  );
}
