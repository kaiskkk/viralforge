import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { getAnthropicApiKey } from "@/lib/anthropic/client";
import { GenerationError, runTool } from "@/lib/anthropic/generate";
import { refundCredit, reserveCredit } from "@/lib/credits";
import { FREE_CREDITS } from "@/lib/plans";
import { getServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/tools";
import type { Plan } from "@/types/database";

export const runtime = "nodejs";
// Une génération peut durer plusieurs dizaines de secondes.
export const maxDuration = 300;

type ErrorCode =
  | "unauthenticated"
  | "invalid_request"
  | "no_credits"
  | "refused"
  | "busy"
  | "generation_failed"
  | "misconfigured";

function fail(status: number, code: ErrorCode, message: string, credits?: number | null) {
  return NextResponse.json({ error: { code, message }, credits }, { status });
}

/** Variables serveur indispensables aux outils. Renvoie la première qui manque. */
function findConfigIssue(): string | null {
  if (!getServiceRoleKey()) {
    return "Configuration incomplète : la clé secrète Supabase (SUPABASE_SERVICE_ROLE_KEY) est absente ou invalide.";
  }
  if (!getAnthropicApiKey()) {
    return "Configuration incomplète : la clé Anthropic (ANTHROPIC_API_KEY) est absente.";
  }
  return null;
}

function describeAnthropicConfigError(error: unknown): string | null {
  if (error instanceof Anthropic.AuthenticationError) {
    return "la clé Anthropic (ANTHROPIC_API_KEY) est refusée";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "la clé Anthropic n'a pas accès à ce modèle";
  }
  if (error instanceof Anthropic.NotFoundError) {
    return "le modèle demandé est introuvable (ANTHROPIC_MODEL)";
  }
  // Compte sans crédit prépayé : l'API répond 400 avec ce message.
  if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
    return "le compte Anthropic n'a pas de crédit";
  }
  return null;
}

/**
 * POST /api/generate
 * Corps : { tool: "clone" | "antidropoff" | "series", input: {...} }
 * Réponse : { result, plan, credits }  — credits vaut null en Pro (illimité).
 *
 * Plan free : un crédit est réservé AVANT l'appel au modèle (opération SQL
 * atomique) puis remboursé si la génération échoue. La dépense d'API est
 * ainsi bornée, même en cas de requêtes simultanées.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return fail(500, "misconfigured", "Le service n'est pas encore configuré.");
  }

  // 1. Authentification
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail(401, "unauthenticated", "Connecte-toi pour utiliser les outils.");
  }

  // 2. Validation de la requête
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_request", "Requête illisible.");
  }
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "invalid_request", parsed.error.issues[0]?.message ?? "Requête invalide.");
  }

  // 3. Configuration serveur : rien ne sert de réserver un crédit sans elle.
  const configIssue = findConfigIssue();
  if (configIssue) {
    console.error(`[generate] ${configIssue}`);
    return fail(500, "misconfigured", configIssue);
  }

  // 4. Plan et crédits
  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan: Plan = profile?.plan === "pro" ? "pro" : "free";

  let credits: number | null = null;
  if (plan === "free") {
    try {
      credits = await reserveCredit(user.id);
    } catch (error) {
      console.error("[generate] réservation du crédit impossible", error);
      return fail(500, "misconfigured", "Impossible de vérifier tes crédits. Réessaie.");
    }
    if (credits === null) {
      return fail(
        402,
        "no_credits",
        `Tu as utilisé tes ${FREE_CREDITS} crédits offerts. Passe en Pro pour générer sans limite.`,
        0,
      );
    }
  }

  // 5. Génération
  try {
    const result = await runTool(parsed.data);
    return NextResponse.json({ result, plan, credits });
  } catch (error) {
    if (plan === "free") {
      const refunded = await refundCredit(user.id);
      credits = refunded ?? credits;
    }
    console.error(`[generate] échec de l'outil "${parsed.data.tool}"`, error);
    return toErrorResponse(error, plan === "free" ? " Ton crédit t'a été rendu." : "", credits);
  }
}

function toErrorResponse(error: unknown, creditNote: string, credits: number | null) {
  if (error instanceof GenerationError && error.code === "refused") {
    return fail(
      422,
      "refused",
      `Claude a décliné cette demande. Reformule ton texte et réessaie.${creditNote}`,
      credits,
    );
  }

  // Clé refusée, sans accès au modèle, ou compte sans crédit : problème de
  // configuration. Le message nomme la cause pour le propriétaire du site.
  const configCause = describeAnthropicConfigError(error);
  if (configCause) {
    return fail(
      500,
      "misconfigured",
      `Le service d'IA est mal configuré : ${configCause}.${creditNote}`,
      credits,
    );
  }

  // Limite de débit, surcharge ou coupure réseau : réessayable.
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.APIConnectionError ||
    (error instanceof Anthropic.APIError && typeof error.status === "number" && error.status >= 500)
  ) {
    return fail(
      503,
      "busy",
      `Le service d'IA est très sollicité. Réessaie dans un instant.${creditNote}`,
      credits,
    );
  }

  return fail(502, "generation_failed", `La génération a échoué. Réessaie.${creditNote}`, credits);
}
