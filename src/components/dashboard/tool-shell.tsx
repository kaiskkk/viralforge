"use client";

import { CircleAlert, LoaderCircle, Sparkles, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useCredits } from "@/components/dashboard/credits-context";
import type { GenerateState } from "@/components/dashboard/use-generate";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";
import { isProfileEmpty, profileSummary } from "@/lib/profile";
import { TOOLS, type ToolId } from "@/lib/tools";

/** En-tête commun aux pages d'outil. */
export function ToolHeader({ tool }: { tool: ToolId }) {
  const { plan, profile } = useCredits();
  const meta = TOOLS[tool];

  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <ToolIcon tool={tool} className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{meta.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/profile"
          className="hairline inline-flex max-w-[260px] items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1 text-xs text-muted transition-colors hover:text-fg"
          title={isProfileEmpty(profile) ? undefined : "Ton profil créateur est appliqué à cet outil"}
        >
          <UserRound className={isProfileEmpty(profile) ? "size-3" : "size-3 text-accent"} aria-hidden />
          <span className="truncate">
            {isProfileEmpty(profile) || !profile ? "Ajoute ton profil créateur" : profileSummary(profile)}
          </span>
        </Link>
        <span className="hairline rounded-full bg-white/[0.03] px-3 py-1 text-xs text-muted">
          {plan === "pro" ? "Illimité avec Pro" : "1 crédit par génération"}
        </span>
      </div>
    </header>
  );
}

/** Deux colonnes : formulaire à gauche, résultat à droite. */
export function ToolColumns({ form, result }: { form: React.ReactNode; result: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="hairline rounded-2xl bg-surface p-5 sm:p-6 xl:sticky xl:top-8">{form}</div>
      <div className="min-w-0">{result}</div>
    </div>
  );
}

/** Bouton de soumission : désactivé sans crédit, avec indicateur de chargement. */
export function GenerateButton({
  loading,
  disabled,
  children,
  className,
}: {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { plan, credits, openUpgrade } = useCredits();
  const outOfCredits = plan === "free" && credits <= 0;

  if (outOfCredits) {
    return (
      <Button onClick={() => openUpgrade("no-credits")} className={className ?? "h-11 w-full"}>
        <Zap className="size-4" aria-hidden />
        Plus de crédits : passer en illimité
      </Button>
    );
  }

  return (
    <Button type="submit" disabled={loading || disabled} className={className ?? "h-11 w-full"}>
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-4" aria-hidden />
      )}
      {loading ? "Génération en cours…" : children}
    </Button>
  );
}

function LoadingPanel({ steps }: { steps: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((current) => Math.min(current + 1, steps.length - 1)),
      6000,
    );
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="hairline rounded-2xl bg-surface p-6" role="status" aria-live="polite">
      <p className="flex items-center gap-2.5 text-sm font-medium">
        <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden />
        {steps[index]}
      </p>
      <p className="mt-1.5 text-[13px] text-muted">
        Compte 30 secondes à 2 minutes. Garde cette page ouverte.
      </p>
      <div className="mt-6 space-y-3" aria-hidden>
        {["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3"].map((width, line) => (
          <div key={line} className={`relative h-3 overflow-hidden rounded-full bg-white/[0.05] ${width}`}>
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorPanel({ code, message }: { code: string; message: string }) {
  const { openUpgrade } = useCredits();
  return (
    <div className="rounded-2xl border border-danger/25 bg-danger/[0.05] p-6" role="alert">
      <p className="flex items-center gap-2.5 text-sm font-medium text-danger">
        <CircleAlert className="size-4" aria-hidden />
        {code === "no_credits" ? "Crédits épuisés" : "Génération impossible"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
      {code === "no_credits" && (
        <Button size="sm" onClick={() => openUpgrade("no-credits")} className="mt-4">
          <Zap className="size-3.5" aria-hidden />
          Passer en illimité
        </Button>
      )}
    </div>
  );
}

function EmptyPanel({ tool, hint }: { tool: ToolId; hint: string }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-white/[0.1] p-8 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[0.04] text-faint">
          <ToolIcon tool={tool} className="size-5" />
        </span>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Après une génération réussie, en gratuit : le solde restant, dit simplement.
 * Au dernier crédit, rappelle que les outils sans IA restent illimités.
 */
function CreditNudge() {
  const { plan, credits, openUpgrade } = useCredits();
  if (plan !== "free") return null;

  const message =
    credits <= 0
      ? "C'était ton dernier crédit offert. La Courbe de rétention, le Studio et le Journal restent gratuits."
      : credits === 1
        ? "Plus qu'1 crédit offert : garde-le pour ton meilleur sujet."
        : `Il te reste ${credits} crédits offerts.`;

  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
      data-testid="credit-nudge"
    >
      <p className="text-[13px] leading-relaxed text-muted">{message}</p>
      <button
        type="button"
        onClick={() => openUpgrade(credits <= 0 ? "no-credits" : "manual")}
        className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-accent hover:underline hover:underline-offset-4"
      >
        <Zap className="size-3.5" aria-hidden />
        Générer sans limite
      </button>
    </div>
  );
}

/** Affiche l'état courant d'une génération : vide, chargement, erreur ou résultat. */
export function ResultPanel<Result>({
  tool,
  state,
  emptyHint,
  loadingSteps,
  loading,
  hideIdle = false,
  children,
}: {
  tool: ToolId;
  state: GenerateState<Result>;
  emptyHint: string;
  loadingSteps: string[];
  /** Remplace l'écran de chargement standard. */
  loading?: React.ReactNode;
  /** Rien à afficher avant la première génération. */
  hideIdle?: boolean;
  children: (result: Result) => React.ReactNode;
}) {
  const anchor = useRef<HTMLDivElement>(null);

  // Sur une seule colonne (téléphone, tablette), le résultat est sous le
  // formulaire : on l'amène à l'écran quand la génération démarre et aboutit.
  useEffect(() => {
    if (state.status === "idle") return;
    if (window.matchMedia("(min-width: 1280px)").matches) return;
    const element = anchor.current;
    if (!element) return;
    const { top } = element.getBoundingClientRect();
    if (top >= 0 && top < window.innerHeight * 0.5) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [state.status]);

  return (
    <div ref={anchor} className="scroll-mt-20">
      {state.status === "idle" && !hideIdle && <EmptyPanel tool={tool} hint={emptyHint} />}
      {state.status === "loading" && (loading ?? <LoadingPanel steps={loadingSteps} />)}
      {state.status === "error" && <ErrorPanel code={state.code} message={state.message} />}
      {state.status === "success" && (
        <div className="animate-fade-up">
          {children(state.result)}
          <CreditNudge />
        </div>
      )}
    </div>
  );
}
