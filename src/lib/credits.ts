import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type UserClient = SupabaseClient<Database>;

/**
 * Deux façons de débiter les crédits, selon la configuration :
 *
 * - avec SUPABASE_SERVICE_ROLE_KEY : fonctions consume_credit / refund_credit,
 *   réservées au serveur ;
 * - sans : fonction spend_own_credit (migration 0003), appelée avec la session
 *   de l'utilisateur. Elle ne peut que diminuer son propre solde.
 */
export function hasServiceRole(): boolean {
  return getServiceRoleKey() !== null;
}

/** La fonction SQL spend_own_credit n'existe pas : la migration 0003 manque. */
export class CreditsSetupError extends Error {
  constructor() {
    super("La fonction spend_own_credit est introuvable : exécute la migration 0003.");
    this.name = "CreditsSetupError";
  }
}

/** Solde de l'utilisateur connecté (lecture autorisée par le RLS). */
export async function readBalance(supabase: UserClient, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`lecture du solde impossible : ${error.message}`);
  return data?.balance ?? 0;
}

/**
 * Débite un crédit. L'UPDATE SQL est atomique : deux requêtes simultanées ne
 * peuvent pas dépenser le même crédit.
 *
 * @returns le solde restant, ou null si le solde était déjà à 0.
 * @throws CreditsSetupError sans clé secrète si la migration 0003 manque.
 */
export async function debitCredit(supabase: UserClient, userId: string): Promise<number | null> {
  if (hasServiceRole()) {
    const { data, error } = await createAdminClient().rpc("consume_credit", { p_user_id: userId });
    if (error) throw new Error(`consume_credit a échoué : ${error.message}`);
    return data;
  }

  const { data, error } = await supabase.rpc("spend_own_credit");
  if (error) {
    // PGRST202 : fonction absente du schéma ; 42883 : même cause côté Postgres.
    if (error.code === "PGRST202" || error.code === "42883") throw new CreditsSetupError();
    throw new Error(`spend_own_credit a échoué : ${error.message}`);
  }
  return data;
}

/**
 * Rend un crédit débité avant une génération qui a échoué. Possible seulement
 * avec la clé secrète : sans elle, le crédit n'est débité qu'après succès.
 *
 * @returns le solde après remboursement, ou null si le remboursement a échoué
 * (l'erreur est journalisée : elle ne doit pas masquer l'erreur d'origine).
 */
export async function refundCredit(userId: string): Promise<number | null> {
  try {
    const { data, error } = await createAdminClient().rpc("refund_credit", { p_user_id: userId });
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error(`[credits] remboursement impossible pour ${userId}`, error);
    return null;
  }
}
