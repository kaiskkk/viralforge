import { Check } from "lucide-react";
import Link from "next/link";

import { CheckoutLink } from "@/components/checkout-link";
import { buttonClasses } from "@/components/ui/button";
import { JOURNAL_FREE_LIMIT } from "@/lib/journal";
import { FREE_CREDITS, PRO_PRICE, PRO_PRICE_PER_DAY } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Cta = {
  label: string;
  /** Sans href, le bouton est affiché désactivé. */
  href?: string;
  /** Lien vers la page de paiement : ouvert dans un nouvel onglet. */
  external?: boolean;
};

const FREE_FEATURES = [
  `${FREE_CREDITS} scripts générés par l'IA, sur les 5 outils`,
  "Courbe de rétention illimitée",
  "Studio téléprompteur illimité",
  `Journal de performance : ${JOURNAL_FREE_LIMIT} vidéos, ta 1re tendance`,
  "Simulateur de score viral illimité",
];

const PRO_FEATURES = [
  "Scripts IA illimités : Blueprint, Cloneur, Anti-Dropoff, Série, Hooks",
  "Journal illimité, toutes tes tendances et ta formule de prochaine vidéo",
  "Courbe de rétention, Studio et simulateur illimités",
  "Profil créateur appliqué à chaque génération",
  "Sans engagement, annulable à tout moment",
];

function CtaButton({ cta, variant }: { cta: Cta; variant: "primary" | "secondary" }) {
  const className = buttonClasses({ variant, className: "w-full" });

  if (!cta.href) {
    return (
      <span aria-disabled className={cn(className, "cursor-default opacity-60")}>
        {cta.label}
      </span>
    );
  }
  if (cta.external) {
    return (
      <CheckoutLink href={cta.href} className={className}>
        {cta.label}
      </CheckoutLink>
    );
  }
  return (
    <Link href={cta.href} className={className}>
      {cta.label}
    </Link>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-7 space-y-3">
      {features.map((feature) => (
        <li key={feature} className="flex gap-3 text-sm leading-relaxed text-muted">
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          {feature}
        </li>
      ))}
    </ul>
  );
}

export function PricingCards({ free, pro, note }: { free: Cta; pro: Cta; note?: string }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="hairline flex flex-col rounded-2xl bg-surface p-7">
          <h3 className="text-sm font-medium text-muted">Free</h3>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-[44px] font-semibold leading-none tracking-tightest">0 €</span>
          </p>
          <p className="mt-2 text-[13px] text-faint">pour toujours</p>
          <p className="mt-3 text-sm text-muted">Pour tester les outils sur tes propres scripts.</p>
          <FeatureList features={FREE_FEATURES} />
          <div className="mt-8 flex-1" />
          <CtaButton cta={free} variant="secondary" />
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl border border-accent/30 bg-surface p-7 shadow-[0_30px_100px_-40px_rgb(var(--accent)/0.35)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-accent">Pro</h3>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
              Illimité
            </span>
          </div>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-[44px] font-semibold leading-none tracking-tightest">{PRO_PRICE}</span>
            <span className="text-sm text-muted">/ mois</span>
          </p>
          {PRO_PRICE_PER_DAY && <p className="mt-2 text-[13px] text-faint">soit {PRO_PRICE_PER_DAY} par jour</p>}
          <p className="mt-3 text-sm text-muted">Pour publier souvent, sans compter.</p>
          <FeatureList features={PRO_FEATURES} />
          <div className="mt-8 flex-1" />
          <CtaButton cta={pro} variant="primary" />
        </div>
      </div>

      {note && <p className="mt-5 text-center text-[13px] text-faint">{note}</p>}
    </div>
  );
}
