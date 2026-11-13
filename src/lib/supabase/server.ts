import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Client Supabase lié à la session de l'utilisateur (cookies).
 * Soumis au RLS : à utiliser dans les Server Components, Server Actions
 * et Route Handlers. Un client par requête, jamais partagé.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis un Server Component : l'écriture de cookies y est
          // impossible. Sans conséquence, le middleware rafraîchit la session.
        }
      },
    },
  });
}
