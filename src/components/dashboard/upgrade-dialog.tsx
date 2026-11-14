"use client";

import { ArrowLeft, Check, Crown, Lock, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CheckoutEmbed } from "@/components/checkout-embed";
import { useCredits, type UpgradeReason } from "@/components/dashboard/credits-context";
import { PLAN_COMPARISON } from "@/lib/plan-comparison";
import { FREE_CREDITS, PRO_PRICE, PRO_PRICE_PER_DAY } from "@/lib/plans";

const TITLES: Record<UpgradeReason, string> = {
  "no-credits": `Tes ${FREE_CREDITS} crédits ont servi. Garde ton rythme.`,
  journal: "Ton journal gratuit est plein.",
  insights: "Tes tendances t'attendent.",
  manual: "Passe en illimité.",
};


/** Fenêtre « Passer en Pro » : ce que l'utilisateur a déjà fait, ce que Pro change, le prix réel. */
export function UpgradeDialog() {
  const { plan, credits, email, upgrade, closeUpgrade } = useCredits();
  const closeButton = useRef<HTMLButtonElement>(null);
  const open = upgrade !== null && plan === "free";
  // Deux étapes : l'argumentaire, puis le paiement intégré, sans quitter la page.
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaying(false);
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeUpgrade();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, closeUpgrade]);

  if (!open) return null;
  const used = Math.max(0, FREE_CREDITS - credits);

  return (
    <div className="fixed inset-0 z-[60] grid items-end sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeUpgrade} aria-label="Fermer" tabIndex={-1} />
      <div className="relative max-h-[92dvh] w-full animate-fade-up overflow-y-auto rounded-t-3xl border border-white/[0.1] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_40px_120px_-30px_rgb(var(--accent)/0.35)] sm:max-w-lg sm:rounded-3xl sm:p-8">
        <button
          ref={closeButton}
          type="button"
          onClick={closeUpgrade}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-fg"
          aria-label="Fermer"
        >
          <X className="size-4" aria-hidden />
        </button>

        {paying ? (
          <div>
            <button
              type="button"
              onClick={() => setPaying(false)}
              className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Retour
            </button>
            <h2 id="upgrade-title" className="mt-3 pr-8 text-xl font-semibold tracking-tight">
              Passer en Pro — {PRO_PRICE}/mois
            </h2>
            <p className="mb-5 mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
              <Lock className="size-3.5 text-accent" aria-hidden />
              Paiement sécurisé, ici même. Sans engagement.
            </p>
            <CheckoutEmbed email={email} />
          </div>
        ) : (
          <>
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-black">
          <Crown className="size-5" aria-hidden />
        </span>
        <h2 id="upgrade-title" className="mt-5 pr-8 text-xl font-semibold tracking-tight">
          {TITLES[upgrade]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {used > 0
            ? `Tu as déjà généré ${used} script${used > 1 ? "s" : ""} avec l'IA. `
            : ""}
          Les créateurs qui percent publient souvent : avec Pro, plus de compteur, tu testes autant d&apos;angles que tu veux.
        </p>

        <table className="mt-6 w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-faint">
              <th scope="col" className="pb-2 font-normal">
                <span className="sr-only">Fonction</span>
              </th>
              <th scope="col" className="pb-2 font-normal">Gratuit</th>
              <th scope="col" className="pb-2 font-normal text-accent">Pro</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.label} className="border-t border-white/[0.06]">
                <th scope="row" className="py-2.5 pr-3 font-normal text-fg">
                  {row.label}
                </th>
                <td className="py-2.5 pr-3 text-muted">{row.free}</td>
                <td className="py-2.5 font-medium text-fg">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
                    {row.pro}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex items-baseline justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3.5">
          <p>
            <span className="text-2xl font-semibold tracking-tight">{PRO_PRICE}</span>
            <span className="text-sm text-muted"> / mois</span>
          </p>
          {PRO_PRICE_PER_DAY && <p className="text-[13px] text-muted">soit {PRO_PRICE_PER_DAY} par jour</p>}
        </div>

        <button
          type="button"
          onClick={() => setPaying(true)}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-7 text-[15px] font-medium text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          <Zap className="size-4" aria-hidden />
          Passer en Pro
        </button>
        <button type="button" onClick={closeUpgrade} className="mt-2 h-10 w-full text-[13px] text-muted transition-colors hover:text-fg">
          Plus tard
        </button>

        <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
          Sans engagement, résiliable depuis tes paramètres. Le paiement s&apos;ouvre ici, dans la page.
        </p>
          </>
        )}
      </div>
    </div>
  );
}
