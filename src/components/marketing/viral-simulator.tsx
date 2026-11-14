"use client";

import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ShareScoreButton } from "@/components/marketing/share-score-button";
import { retentionTone, SingleRetentionChart } from "@/components/retention-report";
import { Button, buttonClasses } from "@/components/ui/button";
import { FREE_CREDITS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { analyzeRetention, type RetentionAnalysis } from "@/lib/retention";
import { MIN_WORDS, scoreScript, type ViralScore } from "@/lib/viral-score";

const EXAMPLE = `Bonjour à tous, aujourd'hui je vais vous parler de productivité. En fait, je pense que beaucoup de gens ont du mal à s'organiser au quotidien et du coup ils perdent vraiment beaucoup de temps sur des choses qui ne sont pas forcément importantes. Moi j'utilise une méthode qui est assez simple et qui consiste à noter trois tâches le matin. Voilà, c'était ma méthode, j'espère que ça vous a plu.`;

const MAX_CHARS = 5000;

/** Couleur associée à un score : vert au-dessus de 70, ambre au-dessus de 45, rouge sinon. */
function tone(score: number) {
  if (score >= 70) return { text: "text-accent", bg: "bg-accent", stroke: "rgb(var(--accent))" };
  if (score >= 45) return { text: "text-warn", bg: "bg-warn", stroke: "rgb(var(--warn))" };
  return { text: "text-danger", bg: "bg-danger", stroke: "rgb(var(--danger))" };
}

/** Anime un nombre de sa valeur courante vers `target`. */
function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return Math.round(value);
}

function ScoreRing({ score }: { score: number | null }) {
  const animated = useAnimatedNumber(score ?? 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const color = tone(score ?? 0);

  return (
    <div
      className="relative size-36 shrink-0"
      role="img"
      aria-label={score === null ? "Score non calculé" : `Score viral : ${score} sur 100`}
    >
      <svg viewBox="0 0 128 128" className="size-full -rotate-90 overflow-visible" aria-hidden>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="8" />
        {score !== null && (
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - animated / 100)}
            style={{ filter: `drop-shadow(0 0 10px ${color.stroke})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div
            className={cn(
              "font-mono text-[44px] font-semibold leading-none tracking-tighter tabular-nums",
              score === null ? "text-faint" : color.text,
            )}
          >
            {score === null ? "––" : animated}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-faint">sur 100</div>
        </div>
      </div>
    </div>
  );
}

function CriterionRow({ label, score, insight }: { label: string; score: number; insight: string }) {
  const color = tone(score);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-fg">{label}</span>
        <span className={cn("font-mono text-xs tabular-nums", color.text)}>{score}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color.bg)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{insight}</p>
    </li>
  );
}

export function ViralSimulator() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ViralScore | null>(null);
  const [retention, setRetention] = useState<RetentionAnalysis | null>(null);
  const [tooShort, setTooShort] = useState(false);
  // Après la première analyse, le score suit les modifications en direct.
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!live) return;
    const timeout = setTimeout(() => {
      const next = scoreScript(text);
      setResult(next);
      setRetention(next ? analyzeRetention(text) : null);
      setTooShort(next === null);
    }, 250);
    return () => clearTimeout(timeout);
  }, [text, live]);

  function analyze(source = text) {
    const next = scoreScript(source);
    setResult(next);
    setRetention(next ? analyzeRetention(source) : null);
    setTooShort(next === null);
    setLive(true);
  }

  function loadExample() {
    setText(EXAMPLE);
    analyze(EXAMPLE);
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="hairline overflow-hidden rounded-2xl bg-surface/80 shadow-[0_40px_120px_-40px_rgb(var(--accent)/0.25)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          Simulateur de score viral
        </div>
        <span className="text-xs text-faint">Gratuit · sans inscription</span>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        {/* Saisie */}
        <div className="flex flex-col p-5 lg:border-r lg:border-white/[0.06]">
          <label htmlFor="simulator-script" className="sr-only">
            Ton script
          </label>
          <textarea
            id="simulator-script"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_CHARS}
            placeholder="Colle ici le script de ta prochaine vidéo…"
            className="min-h-[260px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-fg placeholder:text-faint focus:outline-none"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <span className="font-mono text-xs tabular-nums text-faint">
              {wordCount} mot{wordCount > 1 ? "s" : ""}
              {result ? ` · ≈ ${result.stats.seconds} s à l'oral` : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadExample}>
                Charger un exemple
              </Button>
              <Button size="sm" onClick={() => analyze()} disabled={!text.trim()}>
                Analyser mon script
              </Button>
            </div>
          </div>
        </div>

        {/* Résultat */}
        <div className="border-t border-white/[0.06] bg-white/[0.015] p-5 lg:border-t-0" aria-live="polite">
          <div className="flex items-center gap-5">
            <ScoreRing score={result?.total ?? null} />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-faint">Verdict</p>
              <p className="mt-1.5 text-lg font-semibold leading-snug tracking-tight">
                {result
                  ? result.verdict
                  : tooShort
                    ? "Script trop court"
                    : "En attente de ton script"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {result
                  ? "Modifie ton texte : le score se met à jour en direct."
                  : tooShort
                    ? `Il faut au moins ${MIN_WORDS} mots pour une analyse fiable.`
                    : "Hook, rythme, tension, clarté et chute : cinq signaux analysés instantanément."}
              </p>
            </div>
          </div>

          {result && (
            <div className="animate-fade-up">
              <ul className="mt-6 space-y-4">
                {result.criteria.map((criterion) => (
                  <CriterionRow
                    key={criterion.key}
                    label={criterion.label}
                    score={criterion.score}
                    insight={criterion.insight}
                  />
                ))}
              </ul>

              {result.tips.length > 0 && (
                <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <Lightbulb className="size-3.5 text-warn" aria-hidden />
                    À corriger en priorité
                  </p>
                  <ol className="mt-3 space-y-2">
                    {result.tips.map((tip, index) => (
                      <li key={tip} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                        <span className="font-mono text-xs leading-[1.7] text-faint">{index + 1}.</span>
                        {tip}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <Link href="/signup" className={buttonClasses({ className: "mt-5 w-full" })}>
                Réécrire ce script avec l&apos;IA
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <div className="mt-2.5">
                <ShareScoreButton result={result} />
              </div>
              <p className="mt-2.5 text-center text-xs text-faint">
                {FREE_CREDITS} crédits offerts à l&apos;inscription, sans carte bancaire.
              </p>
            </div>
          )}
        </div>
      </div>

      {result && retention && (
        <div className="animate-fade-up border-t border-white/[0.06] px-3 pb-4 pt-5 sm:px-5" data-testid="simulator-retention">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-2">
            <p className="text-[13px] font-medium">
              Ta courbe de rétention estimée :{" "}
              <span className={cn("font-semibold", retentionTone(retention.finalRetention))}>
                {retention.finalRetention} % encore là à la fin
              </span>
            </p>
            <p className="text-xs text-faint">Survole la courbe : la phrase dite à chaque seconde s&apos;affiche.</p>
          </div>
          <SingleRetentionChart analysis={retention} height={190} />
        </div>
      )}
    </div>
  );
}
