import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { SUPABASE_URL } from "./config";

// Clé secrète (sb_secret_…) ou ancienne clé service_role (JWT).
const SECRET_KEY_PATTERN = /^(sb_secret_[\w-]{8,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/;

/** Clé secrète Supabase, ou null si elle est absente ou n'a pas la forme d'une clé. */
export function getServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && SECRET_KEY_PATTERN.test(key) ? key : null;
}

/**
 * Client service_role : contourne le RLS. Réservé au serveur, pour ce que
 * l'utilisateur n'a pas le droit de faire lui-même (crédits, plan).
 */
export function createAdminClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est absente ou invalide.");
  }

  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
