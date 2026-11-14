import "server-only";

import { NextResponse } from "next/server";

import { FREE_CREDITS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";

/** Éléments communs aux routes /api/generate et /api/generate/commit. */

export type ErrorCode =
  | "unauthenticated"
  | "invalid_request"
  | "no_credits"
  | "refused"
  | "busy"
  | "generation_failed"
  | "misconfigured";

export function fail(status: number, code: ErrorCode, message: string, credits?: number | null) {
  return NextResponse.json({ error: { code, message }, credits }, { status });
}

export function noCredits() {
  return fail(
    402,
    "no_credits",
    `Tu as utilisé tes ${FREE_CREDITS} crédits offerts. Passe en Pro pour générer sans limite.`,
    0,
  );
}

export function creditsUnavailable(error: unknown) {
  console.error("[generate] crédits indisponibles", error);
  return fail(500, "misconfigured", "Impossible de vérifier tes crédits. Réessaie.");
}

/** Utilisateur connecté et son plan, ou null sans session. */
export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan: Plan = profile?.plan === "pro" ? "pro" : "free";
  return { supabase, user, plan };
}
