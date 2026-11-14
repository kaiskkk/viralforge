"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CHECKOUT_URL, WHOP_PLAN_ID } from "@/lib/plans";

/**
 * Paiement du plan Pro intégré au site : le formulaire Whop s'ouvre dans la
 * page, sans nouvel onglet. L'e-mail du compte est pré-rempli, donc le plan Pro
 * s'active automatiquement sur le bon compte (le webhook relie par l'e-mail).
 *
 * Un lien de secours vers la page de paiement Whop reste toujours visible : si
 * le cadre ne se charge pas, le paiement reste possible.
 */
export function CheckoutEmbed({ email }: { email?: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  // Sans identifiant de plan Whop lisible, on ne peut pas intégrer : lien direct.
  if (!WHOP_PLAN_ID) {
    return (
      <a href={CHECKOUT_URL} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-black">
        Ouvrir le paiement sécurisé
        <ExternalLink className="size-4" aria-hidden />
      </a>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] p-6 text-center" role="status">
        <CircleCheck className="mx-auto size-8 text-accent" aria-hidden />
        <p className="mt-3 text-[15px] font-semibold">Paiement reçu, merci !</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Ton plan Pro s&apos;active dans quelques secondes. Si le bandeau « Pro » n&apos;apparaît pas, actualise la page.
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-black"
        >
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <WhopCheckoutEmbed
          planId={WHOP_PLAN_ID}
          theme="dark"
          prefill={email ? { email } : undefined}
          onComplete={() => {
            setDone(true);
            // Laisse le webhook activer le Pro, puis rafraîchit les données serveur.
            setTimeout(() => router.refresh(), 3500);
          }}
          fallback={
            <div className="grid min-h-[320px] place-items-center p-8 text-center">
              <div>
                <LoaderCircle className="mx-auto size-5 animate-spin text-accent" aria-hidden />
                <p className="mt-3 text-sm text-muted">Chargement du paiement sécurisé…</p>
              </div>
            </div>
          }
        />
      </div>
      <p className="text-center text-[12px] text-faint">
        Le formulaire ne s&apos;affiche pas ?{" "}
        <a href={CHECKOUT_URL} target="_blank" rel="noopener" className="text-muted underline underline-offset-2 hover:text-fg">
          Payer sur la page sécurisée Whop
        </a>
        .
      </p>
    </div>
  );
}
