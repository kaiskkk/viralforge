"use client";

import { Lock, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CheckoutEmbed } from "@/components/checkout-embed";
import { cn } from "@/lib/utils";
import { PRO_PRICE } from "@/lib/plans";

/**
 * Bouton « Passer en Pro » qui ouvre le paiement intégré dans une fenêtre, sur
 * le site, au lieu d'envoyer vers une page Whop séparée.
 */
export function CheckoutButton({
  email,
  className,
  children,
}: {
  email?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Paiement Pro">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fermer" tabIndex={-1} />
          <div className="relative max-h-[92dvh] w-full animate-fade-up overflow-y-auto rounded-t-3xl border border-white/[0.1] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-3xl sm:p-7">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-fg"
              aria-label="Fermer"
            >
              <X className="size-4" aria-hidden />
            </button>
            <h2 className="pr-8 text-xl font-semibold tracking-tight">Passer en Pro — {PRO_PRICE}/mois</h2>
            <p className="mb-5 mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
              <Lock className="size-3.5 text-accent" aria-hidden />
              Paiement sécurisé, ici même. Sans engagement.
            </p>
            <CheckoutEmbed email={email} />
          </div>
        </div>
      )}
    </>
  );
}

/** Variante du style d'un bouton, pour réutiliser les classes existantes. */
export function checkoutButtonClass(...classes: (string | undefined)[]) {
  return cn(classes);
}
