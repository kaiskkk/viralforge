import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Réserve un crédit avant de lancer une génération.
 * L'UPDATE SQL est atomique : deux requêtes simultanées ne peuvent pas
 * dépenser le même crédit.
 *
 * @returns le solde restant, ou null si le solde était déjà à 0.
 */
export async function reserveCredit(userId: string): Promise<number | null> {
  const { data, error } = await createAdminClient().rpc("consume_credit", {
    p_user_id: userId,
  });
  if (error) throw new Error(`consume_credit a échoué : ${error.message}`);
  return data;
}

/**
 * Rend le crédit réservé quand la génération a échoué.
 *
 * @returns le solde après remboursement, ou null si le remboursement a échoué
 * (l'erreur est journalisée : elle ne doit pas masquer l'erreur d'origine).
 */
export async function refundCredit(userId: string): Promise<number | null> {
  try {
    const { data, error } = await createAdminClient().rpc("refund_credit", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error(`[credits] remboursement impossible pour ${userId}`, error);
    return null;
  }
}
