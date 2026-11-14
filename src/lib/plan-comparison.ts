import { JOURNAL_FREE_LIMIT } from "@/lib/journal";
import { FREE_CREDITS } from "@/lib/plans";

/** Ce que Pro change, ligne par ligne, par rapport au plan gratuit. Uniquement des fonctions réelles. */
export const PLAN_COMPARISON = [
  { label: "Scripts générés par l'IA (5 outils)", free: `${FREE_CREDITS} offerts`, pro: "Illimités" },
  { label: "Journal de performance", free: `${JOURNAL_FREE_LIMIT} vidéos`, pro: "Illimité" },
  { label: "Tendances tirées de tes vidéos", free: "La 1re", pro: "Toutes + ta formule" },
  { label: "Courbe de rétention, Studio", free: "Illimités", pro: "Illimités" },
];
