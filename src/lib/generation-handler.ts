import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { FreeEngineError, GenerationError, runTool } from "@/lib/ai/generate";
import { CreditsSetupError, debitCredit, hasServiceRole, readBalance, refundCredit } from "@/lib/credits";
import { creditsUnavailable, fail, getSessionUser, noCredits } from "@/lib/generate-api";
import { profileFromRow } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { generateRequestSchema, NO_VIDEO_SOURCE, type GenerationContext } from "@/lib/tools";
import { fetchVideoSource } from "@/lib/video-meta";

/**
 * Cœur des routes de génération (/api/generate, /api/clone-video) : session,
 * validation, crédits, profil créateur, génération, débit.
 * Réponse : { result, plan, credits } — credits vaut null en Pro (illimité).
 *
 * Le modèle est le générateur gratuit, ou Claude si ANTHROPIC_API_KEY est
 * renseignée (voir src/lib/ai/client.ts). Une génération qui échoue ne coûte
 * jamais de crédit.
 */
export async function handleGeneration(body: unknown): Promise<NextResponse> {
  if (!isSupabaseConfigured) {
    return fail(500, "misconfigured", "Le service n'est pas encore configuré.");
  }

  // 1. Authentification
  const session = await getSessionUser();
  if (!session) {
    return fail(401, "unauthenticated", "Connecte-toi pour utiliser les outils.");
  }
  const { supabase, user, plan } = session;

  // 2. Validation de la requête
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "invalid_request", parsed.error.issues[0]?.message ?? "Requête invalide.");
  }

  // 3. Crédits (plan free)
  const free = plan === "free";
  // Avec la clé secrète, le crédit est réservé avant l'appel au modèle puis
  // rendu en cas d'échec : la consommation reste bornée même avec des
  // requêtes simultanées. Sans elle, il est débité après une génération réussie.
  const reserveFirst = free && hasServiceRole();

  let credits: number | null = null;
  if (free) {
    try {
      credits = reserveFirst ? await debitCredit(supabase, user.id) : await readBalance(supabase, user.id);
    } catch (error) {
      return creditsUnavailable(error);
    }
    // Réservation : null si le solde était vide. Lecture : il faut au moins 1 crédit.
    if (credits === null || (!reserveFirst && credits <= 0)) return noCredits();
  }

  // 4. Génération, dans la voix du créateur s'il a rempli son profil.
  const { data: profileRow } = await supabase
    .from("creator_profiles")
    .select("niche, audience, tone, platform, style_notes")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileRow ? profileFromRow(profileRow) : null;

  // Blueprint : informations publiques de la vidéo source. Jamais bloquant :
  // un lien illisible donne une source « link » et le plan part de la niche.
  const context: GenerationContext =
    parsed.data.tool === "blueprint"
      ? { video: parsed.data.input.url ? await fetchVideoSource(parsed.data.input.url) : NO_VIDEO_SOURCE }
      : parsed.data.tool === "antidropoff"
        ? { sourceText: parsed.data.input.script }
        : {};

  let result: Awaited<ReturnType<typeof runTool>>;
  try {
    result = await runTool(parsed.data, profile, context);
  } catch (error) {
    if (reserveFirst) credits = (await refundCredit(user.id)) ?? credits;
    console.error(`[generate] échec de l'outil "${parsed.data.tool}"`, error);
    const creditNote = !free ? "" : reserveFirst ? " Ton crédit t'a été rendu." : " Aucun crédit n'a été débité.";
    return toErrorResponse(error, creditNote, credits);
  }

  // 5. Sans réservation préalable, le crédit est débité après succès.
  if (free && !reserveFirst) {
    try {
      const remaining = await debitCredit(supabase, user.id);
      // Solde tombé à 0 entre-temps (requêtes simultanées) : pas de résultat sans crédit.
      if (remaining === null) return noCredits();
      credits = remaining;
    } catch (error) {
      if (!(error instanceof CreditsSetupError)) return creditsUnavailable(error);
      // Migration 0003 absente : la génération est rendue, sans décompte.
      console.warn(`[generate] ${error.message}`);
    }
  }

  return NextResponse.json({ result, plan, credits });
}

function toErrorResponse(error: unknown, creditNote: string, credits: number | null) {
  if (error instanceof GenerationError && error.code === "refused") {
    return fail(
      422,
      "refused",
      `Le modèle a décliné cette demande. Reformule ton texte et réessaie.${creditNote}`,
      credits,
    );
  }

  // Générateur gratuit saturé (limite de débit partagée) ou injoignable.
  if (error instanceof FreeEngineError) {
    return fail(
      503,
      "busy",
      error.code === "busy"
        ? `Le générateur gratuit est très demandé en ce moment. Réessaie ${retryDelay(error.retryAfterSeconds)}.${creditNote}`
        : `Le générateur gratuit est momentanément indisponible. Réessaie dans quelques minutes.${creditNote}`,
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

/** « dans 40 secondes », « dans 2 minutes » ; « dans une minute » si le délai est inconnu. */
function retryDelay(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "dans une minute";
  if (seconds < 60) return `dans ${Math.max(10, Math.ceil(seconds / 5) * 5)} secondes`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "dans une minute" : `dans ${minutes} minutes`;
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
