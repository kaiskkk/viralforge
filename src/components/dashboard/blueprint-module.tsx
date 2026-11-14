"use client";

import { Check, Link2, LoaderCircle, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { useCredits } from "@/components/dashboard/credits-context";
import { BlueprintResult } from "@/components/dashboard/results/blueprint-result";
import { SaveButton } from "@/components/dashboard/save-button";
import { GenerateButton, ResultPanel } from "@/components/dashboard/tool-shell";
import { useGenerate } from "@/components/dashboard/use-generate";
import { ToolIcon } from "@/components/tool-icon";
import { Input, Label } from "@/components/ui/field";
import { blueprintInputSchema, type BlueprintInput } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { detectVideoUrl, PLATFORM_LABELS } from "@/lib/video-url";

const LOADING_STEPS = [
  "Lecture de la vidéo source",
  "Décodage des déclencheurs psychologiques",
  "Découpage seconde par seconde",
  "Écriture de ton script",
  "Conseils de montage",
];

/** Chargement : les étapes se cochent une à une, la dernière reste active jusqu'au résultat. */
function BlueprintLoading() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActive((current) => Math.min(current + 1, LOADING_STEPS.length - 1)), 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-surface p-6" role="status" aria-live="polite">
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/[0.06]" aria-hidden>
        <div className="h-full w-1/3 animate-[blueprint-scan_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-accent to-transparent" />
      </div>
      <div className="flex items-center gap-3">
        <span className="relative grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <span className="absolute inset-0 animate-ping rounded-xl bg-accent/20" aria-hidden />
          <ToolIcon tool="blueprint" className="relative size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Ton blueprint se construit…</p>
          <p className="text-xs text-muted">Compte 30 secondes à 2 minutes. Garde cette page ouverte.</p>
        </div>
      </div>
      <ol className="mt-6 space-y-3">
        {LOADING_STEPS.map((step, index) => (
          <li
            key={step}
            className={cn(
              "flex items-center gap-3 text-[13px] transition-colors",
              index < active ? "text-muted" : index === active ? "text-fg" : "text-faint",
            )}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border",
                index < active ? "border-accent/40 bg-accent/15 text-accent" : index === active ? "border-accent/60" : "border-white/[0.1]",
              )}
            >
              {index < active ? (
                <Check className="size-3" aria-hidden />
              ) : index === active ? (
                <LoaderCircle className="size-3 animate-spin text-accent" aria-hidden />
              ) : null}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Video-to-Viral Blueprint : outil phare, en tête du dashboard. Lien d'une
 * vidéo virale + niche → score, déclencheurs, découpage seconde par seconde,
 * script prêt à tourner et conseils de montage (POST /api/clone-video).
 */
export function BlueprintModule() {
  const { plan } = useCredits();
  const { state, generate } = useGenerate("blueprint", { endpoint: "/api/clone-video" });
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<BlueprintInput | null>(null);

  const detected = url.trim() ? detectVideoUrl(url) : null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = blueprintInputSchema.safeParse({ url, niche });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Vérifie les champs.");
      return;
    }
    setFieldError(null);
    setSubmitted(parsed.data);
    void generate(parsed.data);
  }

  return (
    <section id="blueprint" aria-labelledby="blueprint-title" className="scroll-mt-24 space-y-5">
      {/* Bordure lumineuse : dégradé d'un pixel autour de la carte */}
      <div className="rounded-3xl bg-gradient-to-br from-accent/70 via-white/[0.08] to-accent/25 p-px shadow-[0_0_90px_-30px_rgb(var(--accent)/0.55)]">
        <div className="relative overflow-hidden rounded-[23px] bg-surface p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-accent/10 blur-3xl" aria-hidden />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-black shadow-[0_0_30px_-6px_rgb(var(--accent)/0.8)]">
                <ToolIcon tool="blueprint" className="size-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                    Nouveau
                  </span>
                  <span className="rounded-full border border-accent/40 bg-accent/[0.08] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    IA avancée
                  </span>
                </div>
                <h2 id="blueprint-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  Video-to-Viral Blueprint
                </h2>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted sm:text-sm">
                  Colle le lien d&apos;une vidéo qui a explosé : tu reçois son potentiel viral, les
                  déclencheurs qui la font marcher, son plan seconde par seconde et ton script prêt
                  à tourner, adapté à ta niche.
                </p>
              </div>
            </div>
            <span className="hairline rounded-full bg-white/[0.03] px-3 py-1 text-xs text-muted">
              {plan === "pro" ? "Illimité avec Pro" : "1 crédit par blueprint"}
            </span>
          </div>

          <form onSubmit={onSubmit} className="relative mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <Label htmlFor="blueprint-url">Lien de la vidéo virale</Label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
                <Input
                  id="blueprint-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={500}
                  placeholder="Colle le lien d'une vidéo virale (TikTok, Reels, YouTube Shorts)..."
                  className="h-12 pl-10"
                />
              </div>
              <p className="mt-1.5 min-h-[18px] text-xs text-faint" aria-live="polite">
                {detected ? (
                  <span className="text-accent">Lien {PLATFORM_LABELS[detected.platform]} reconnu</span>
                ) : url.trim() ? (
                  "TikTok, Instagram Reels ou YouTube Shorts."
                ) : (
                  "Optionnel : sans lien, le plan part des formats qui marchent dans ta niche."
                )}
              </p>
            </div>
            <div>
              <Label htmlFor="blueprint-niche">Ta niche ou ton sujet</Label>
              <div className="relative">
                <Target className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
                <Input
                  id="blueprint-niche"
                  value={niche}
                  onChange={(event) => setNiche(event.target.value)}
                  maxLength={120}
                  placeholder="Ta niche ou ton sujet (ex: E-commerce, Fitness, Immobilier)..."
                  className="h-12 pl-10"
                  required
                />
              </div>
            </div>

            {fieldError && (
              <p role="alert" className="text-[13px] text-danger lg:col-span-2">
                {fieldError}
              </p>
            )}

            <div className="lg:col-span-2">
              <GenerateButton
                loading={state.status === "loading"}
                className="h-14 w-full text-base shadow-[0_0_40px_-12px_rgb(var(--accent)/0.9)]"
              >
                Générer mon Blueprint Viral
              </GenerateButton>
            </div>
          </form>
        </div>
      </div>

      <ResultPanel
        tool="blueprint"
        state={state}
        emptyHint=""
        loadingSteps={LOADING_STEPS}
        loading={<BlueprintLoading />}
        hideIdle
      >
        {(output) => (
          <BlueprintResult
            output={output}
            actions={
              submitted && (
                <SaveButton payload={{ tool: "blueprint", title: output.title.slice(0, 200) || "Blueprint", input: submitted, output }} />
              )
            }
          />
        )}
      </ResultPanel>
    </section>
  );
}
