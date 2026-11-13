"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { Plan } from "@/types/database";

type CreditsContextValue = {
  plan: Plan;
  /** Solde affiché. Sans objet en Pro (illimité). */
  credits: number;
  setCredits: (credits: number) => void;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

/**
 * Partage le plan et le solde entre la sidebar et les outils : après une
 * génération, le compteur se met à jour sans recharger la page.
 */
export function CreditsProvider({
  plan,
  initialCredits,
  children,
}: {
  plan: Plan;
  initialCredits: number;
  children: React.ReactNode;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const value = useMemo(() => ({ plan, credits, setCredits }), [plan, credits]);

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits(): CreditsContextValue {
  const context = useContext(CreditsContext);
  if (!context) throw new Error("useCredits doit être utilisé dans un CreditsProvider.");
  return context;
}
