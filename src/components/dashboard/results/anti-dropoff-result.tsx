"use client";

import { useRef, useState } from "react";

import { ShootButton } from "@/components/dashboard/shoot-button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { AntiDropoffOutput, SegmentStatus } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { formatDuration, speakingSeconds } from "@/lib/viral-score";

const STATUS = {
  strong: { label: "Retient", badge: "", highlight: "" },
  slow: {
    label: "Ralentit",
    badge: "bg-warn/15 text-warn",
    highlight: "bg-warn/[0.16] text-warn hover:bg-warn/25 decoration-warn/50",
  },
  critical: {
    label: "Décrochage",
    badge: "bg-danger/15 text-danger",
    highlight: "bg-danger/[0.16] text-danger hover:bg-danger/25 decoration-danger/60",
  },
} satisfies Record<SegmentStatus, { label: string; badge: string; highlight: string }>;

function scoreTone(score: number) {
  if (score >= 70) return "text-accent";
  if (score >= 45) return "text-warn";
  return "text-danger";
}

export function AntiDropoffResult({
  output,
  actions,
}: {
  output: AntiDropoffOutput;
  /** Actions supplémentaires de l'en-tête (ex. bouton Sauvegarder). */
  actions?: React.ReactNode;
}) {
  const issues = output.segments
    .map((segment, index) => ({ ...segment, index }))
    .filter((segment) => segment.status !== "strong");
  const slowCount = issues.filter((issue) => issue.status === "slow").length;
  const criticalCount = issues.length - slowCount;

  const [active, setActive] = useState<number | null>(issues[0]?.index ?? null);
  const cards = useRef(new Map<number, HTMLLIElement>());

  function focusIssue(index: number) {
    setActive(index);
    cards.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="space-y-5">
      {/* Score */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5 sm:p-6">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-faint">Rétention estimée</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-mono text-5xl font-semibold leading-none tracking-tighter tabular-nums",
                scoreTone(output.retentionScore),
              )}
            >
              {output.retentionScore}
            </span>
            <span className="text-sm text-faint">/ 100</span>
          </p>
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="text-sm leading-relaxed">{output.verdict}</p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={cn("rounded-full px-2.5 py-1", STATUS.critical.badge)}>
              {criticalCount} décrochage{criticalCount > 1 ? "s" : ""}
            </span>
            <span className={cn("rounded-full px-2.5 py-1", STATUS.slow.badge)}>
              {slowCount} passage{slowCount > 1 ? "s" : ""} lent{slowCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </Card>

      {/* Script annoté */}
      <Card>
        <CardHeader
          eyebrow="Ton script, annoté"
          title={
            issues.length > 0
              ? "Clique sur un passage surligné pour voir sa réécriture"
              : "Aucun passage à corriger"
          }
        />
        <p className="whitespace-pre-wrap px-5 py-5 text-[15px] leading-[1.9] sm:px-6">
          {output.segments.map((segment, index) =>
            segment.status === "strong" ? (
              <span key={index}>{segment.text} </span>
            ) : (
              <span key={index}>
                {/* <span role="button"> et non <button> : un bouton est un bloc
                    insécable, alors que le surlignage doit suivre le fil du texte. */}
                <span
                  role="button"
                  tabIndex={0}
                  aria-pressed={active === index}
                  onClick={() => focusIssue(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      focusIssue(index);
                    }
                  }}
                  className={cn(
                    "cursor-pointer box-decoration-clone rounded px-1 py-0.5 transition-colors",
                    STATUS[segment.status].highlight,
                    active === index && "underline decoration-2 underline-offset-4",
                  )}
                >
                  {segment.text}
                </span>{" "}
              </span>
            ),
          )}
        </p>
      </Card>

      {/* Réécritures */}
      {issues.length > 0 && (
        <ol className="space-y-3">
          {issues.map((issue) => (
            <li
              key={issue.index}
              ref={(node) => {
                if (node) cards.current.set(issue.index, node);
                else cards.current.delete(issue.index);
              }}
              className={cn(
                "hairline scroll-mt-24 rounded-2xl bg-surface p-5 transition-colors",
                active === issue.index && "border-white/[0.2] bg-elevated",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS[issue.status].badge)}>
                  {STATUS[issue.status].label}
                </span>
                {issue.rewrite && <CopyButton text={issue.rewrite} />}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted line-through decoration-white/20">
                {issue.text}
              </p>
              {issue.reason && <p className="mt-2 text-[13px] leading-relaxed text-muted">{issue.reason}</p>}
              {issue.rewrite && (
                <p className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.05] px-3.5 py-2.5 text-sm leading-relaxed">
                  {issue.rewrite}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Version finale */}
      <Card>
        <CardHeader
          eyebrow={`Version réécrite · ≈ ${formatDuration(speakingSeconds(output.improvedScript))} à l'oral`}
          title="Le script complet, réécritures intégrées"
          actions={
            <>
              <CopyButton text={output.improvedScript} />
              <ShootButton script={output.improvedScript} title="Script réécrit" />
              {actions}
            </>
          }
        />
        <p className="whitespace-pre-wrap px-5 py-5 text-[15px] leading-[1.75] sm:px-6">
          {output.improvedScript}
        </p>
      </Card>
    </div>
  );
}
