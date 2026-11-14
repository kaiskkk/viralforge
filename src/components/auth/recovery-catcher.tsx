"use client";

import { useEffect } from "react";

/**
 * Rattrapage du lien « mot de passe oublié ».
 *
 * Quand le projet Supabase renvoie le lien de récupération vers sa « Site URL »
 * (l'accueil) au lieu de notre page, les jetons arrivent dans l'URL
 * (`#...type=recovery` ou `?type=recovery`). Ce composant, monté partout, les
 * détecte et renvoie vers la page de choix d'un nouveau mot de passe, en
 * conservant les jetons. Il ne crée aucun client Supabase, pour ne pas
 * consommer les jetons avant la bonne page.
 */
export function RecoveryCatcher() {
  useEffect(() => {
    if (window.location.pathname === "/reset-password") return;
    const hash = window.location.hash.slice(1);
    const search = window.location.search.slice(1);
    const isRecovery =
      /(^|&)type=recovery(&|$)/.test(hash) ||
      /(^|&)type=recovery(&|$)/.test(search) ||
      (hash.includes("access_token=") && hash.includes("type=recovery"));
    if (!isRecovery) return;
    window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
