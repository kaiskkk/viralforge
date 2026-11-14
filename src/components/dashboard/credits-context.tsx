"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { CreatorProfile } from "@/lib/profile";
import type { Plan } from "@/types/database";

type CreditsContextValue = {
  plan: Plan;
  /** Solde affiché. Sans objet en Pro (illimité). */
  credits: number;
  setCredits: (credits: number) => void;
  /** Profil créateur, partagé avec les en-têtes d'outils. */
  profile: CreatorProfile | null;
  setProfile: (profile: CreatorProfile) => void;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

/**
 * Partage le plan, le solde et le profil entre la navigation et les outils :
 * après une génération, le compteur se met à jour sans recharger la page.
 */
export function CreditsProvider({
  plan,
  initialCredits,
  initialProfile,
  children,
}: {
  plan: Plan;
  initialCredits: number;
  initialProfile: CreatorProfile | null;
  children: React.ReactNode;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [profile, setProfile] = useState(initialProfile);
  const value = useMemo(
    () => ({ plan, credits, setCredits, profile, setProfile }),
    [plan, credits, profile],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits(): CreditsContextValue {
  const context = useContext(CreditsContext);
  if (!context) throw new Error("useCredits doit être utilisé dans un CreditsProvider.");
  return context;
}
