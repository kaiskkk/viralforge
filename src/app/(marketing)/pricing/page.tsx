import type { Metadata } from "next";

import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { getViewer } from "@/lib/auth";
import { CHECKOUT_URL, FREE_CREDITS, getCheckoutUrl, isPro } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Tarifs",
  description: `Commence avec ${FREE_CREDITS} crédits offerts, passe en Pro pour des générations illimitées.`,
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
    note = "Tu es en Pro : tes générations sont illimitées.";
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
              {FREE_CREDITS} crédits offerts pour tester les trois outils sur tes propres scripts.
              Aucune carte bancaire demandée.
            </p>
          </div>
          <div className="mt-14">
            <PricingCards free={free} pro={pro} note={note} />
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.06]">
        <Faq />
      </div>
    </>
  );
}
