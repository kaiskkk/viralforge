import type { Metadata } from "next";

import { Check } from "lucide-react";

import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { getViewer } from "@/lib/auth";
import { PLAN_COMPARISON } from "@/lib/plan-comparison";
import { CHECKOUT_URL, FREE_CREDITS, getCheckoutUrl, isPro, PRO_PRICE, PRO_PRICE_PER_DAY } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Tarifs",
  description: `Commence avec ${FREE_CREDITS} scripts IA offerts et les outils de mesure gratuits, passe en Pro pour tout en illimité.`,
};

// Les boutons dépendent de l'utilisateur connecté et de son plan.
export const dynamic = "force-dynamic";

type Cta = { label: string; href?: string; external?: boolean };

export default async function PricingPage() {
  const viewer = await getViewer();

  let free: Cta;
  let pro: Cta;
  let note: string;

  if (!viewer) {
    free = { label: "Créer un compte gratuit", href: "/signup" };
    pro = { label: "Passer en Pro", href: CHECKOUT_URL, external: true };
    note =
      "Paiement sécurisé. Paie avec l'adresse e-mail de ton compte ViralForge : ton plan Pro s'active tout seul.";
  } else if (isPro(viewer.plan)) {
    free = { label: "Inclus dans ton plan" };
    pro = { label: "Ton plan actuel" };
    note = "Tu es en Pro : tout est illimité.";
  } else {
    free = { label: "Ton plan actuel" };
    pro = { label: "Passer en Pro", href: getCheckoutUrl(viewer), external: true };
    note = `Paiement sécurisé. Paie avec l'adresse ${viewer.email} : ton plan Pro s'active tout seul.`;
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-medium text-accent">Tarifs</p>
            <h1 className="mt-3 text-[44px] font-semibold leading-[1.05] tracking-tightest sm:text-6xl">
              <span className="text-gradient">Gratuit pour essayer. Illimité pour publier.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              {FREE_CREDITS} scripts IA offerts, et la Courbe de rétention, le Studio et le Journal gratuits pour
              toujours. Aucune carte bancaire demandée.
            </p>
          </div>
          <div className="mt-14">
            <PricingCards free={free} pro={pro} note={note} email={viewer?.email} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-16 sm:py-24" aria-labelledby="compare-title">
        <div className="mx-auto max-w-3xl px-5">
          <h2 id="compare-title" className="text-center text-3xl font-semibold tracking-tightest sm:text-[40px]">
            <span className="text-gradient">Ce que Pro change</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-[15px] leading-relaxed text-muted">
            {PRO_PRICE} par mois{PRO_PRICE_PER_DAY ? `, soit ${PRO_PRICE_PER_DAY} par jour` : ""}. Sans engagement : tu arrêtes
            quand tu veux.
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-widest text-faint">
                  <th scope="col" className="px-5 py-3 font-normal">
                    <span className="sr-only">Fonction</span>
                  </th>
                  <th scope="col" className="px-3 py-3 font-normal">Gratuit</th>
                  <th scope="col" className="px-5 py-3 font-normal text-accent">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-white/[0.06] first:border-t-0">
                    <th scope="row" className="px-5 py-4 font-normal text-fg">
                      {row.label}
                    </th>
                    <td className="px-3 py-4 text-muted">{row.free}</td>
                    <td className="px-5 py-4 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-4 shrink-0 text-accent" aria-hidden />
                        {row.pro}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.06]">
        <Faq />
      </div>
    </>
  );
}
