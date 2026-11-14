"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { CreatorProfile } from "@/lib/profile";
import type { Plan } from "@/types/database";

/** Pourquoi la fenêtre « Passer en Pro » s'ouvre : adapte son titre. */
export type UpgradeReason = "no-credits" | "journal" | "insights" | "manual";

type CreditsContextValue = {
  plan: Plan;
  email: string;
  /** Solde affiché. Sans objet en Pro (illimité). */
  credits: number;
  setCredits: (credits: number) => void;
  /** Profil créateur, partagé avec les en-têtes d'outils. */
  profile: CreatorProfile | null;
  setProfile: (profile: CreatorProfile) => void;
  /** Fenêtre « Passer en Pro » ouverte, et pour quelle raison. */
  upgrade: UpgradeReason | null;
  openUpgrade: (reason: UpgradeReason) => void;
  closeUpgrade: () => void;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

/**
 * Partage le plan, le solde et le profil entre la navigation et les outils :
 * après une génération, le compteur se met à jour sans recharger la page.
 */
export function CreditsProvider({
  plan,
  email,
  initialCredits,
  initialProfile,
  children,
}: {
  plan: Plan;
  email: string;
  initialCredits: number;
  initialProfile: CreatorProfile | null;
  children: React.ReactNode;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [profile, setProfile] = useState(initialProfile);
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  const value = useMemo(
    () => ({
      plan,
      email,
      credits,
      setCredits,
      profile,
      setProfile,
      upgrade,
      openUpgrade: (reason: UpgradeReason) => setUpgrade(reason),
      closeUpgrade: () => setUpgrade(null),
    }),
    [plan, email, credits, profile, upgrade],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits(): CreditsContextValue {
  const context = useContext(CreditsContext);
  if (!context) throw new Error("useCredits doit être utilisé dans un CreditsProvider.");
  return context;
}
