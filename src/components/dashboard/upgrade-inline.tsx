"use client";

import { useCredits, type UpgradeReason } from "@/components/dashboard/credits-context";

/** Lien texte « Passer en Pro » qui ouvre la fenêtre de paiement intégrée. */
export function UpgradeInline({
  reason = "manual",
  className,
  children,
}: {
  reason?: UpgradeReason;
  className?: string;
  children: React.ReactNode;
}) {
  const { openUpgrade } = useCredits();
  return (
    <button type="button" onClick={() => openUpgrade(reason)} className={className}>
      {children}
    </button>
  );
}
