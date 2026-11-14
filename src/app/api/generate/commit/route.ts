import { NextResponse } from "next/server";

import { CreditsSetupError, debitCredit, readBalance } from "@/lib/credits";
import { creditsUnavailable, fail, getSessionUser, noCredits } from "@/lib/generate-api";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * POST /api/generate/commit
 * Appelé par le navigateur après une génération réussie avec le générateur
 * gratuit : débite un crédit du plan free. Réponse : { plan, credits }.
 */
export async function POST() {
  if (!isSupabaseConfigured) {
    return fail(500, "misconfigured", "Le service n'est pas encore configuré.");
  }

  const session = await getSessionUser();
  if (!session) {
    return fail(401, "unauthenticated", "Connecte-toi pour utiliser les outils.");
  }
  const { supabase, user, plan } = session;
  if (plan === "pro") return NextResponse.json({ plan, credits: null });

  try {
    const remaining = await debitCredit(supabase, user.id);
    if (remaining === null) return noCredits();
    return NextResponse.json({ plan, credits: remaining });
  } catch (error) {
    if (!(error instanceof CreditsSetupError)) return creditsUnavailable(error);
    // Migration 0003 absente : la génération reste acquise, sans décompte.
    console.warn(`[generate/commit] ${error.message}`);
    try {
      return NextResponse.json({ plan, credits: await readBalance(supabase, user.id) });
    } catch (readError) {
      return creditsUnavailable(readError);
    }
  }
}
