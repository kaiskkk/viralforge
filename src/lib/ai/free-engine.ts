import "server-only";

/**
 * Générateur gratuit, appelé depuis le serveur du site.
 *
 * Il utilise l'API publique « Classic » de Pollinations
 * (https://github.com/pollinations/pollinations/blob/main/APIDOCS.md) : pas de
 * clé, pas de compte, pas de coût. En contrepartie, elle est limitée par
 * adresse IP (une génération à la fois, environ 30 secondes entre deux) et
 * fournie « au mieux », sans garantie de disponibilité.
 *
 * Quand la limite est atteinte, l'API répond 402 avec un en-tête Retry-After :
 * on patiente le temps indiqué, dans la limite du temps d'exécution de la route.
 */

import { z } from "zod";

import type { CreatorProfile } from "@/lib/profile";
import type { GenerateRequest, ToolOutputs } from "@/lib/tools";

import { finalizeOutput, GenerationError, getToolSpec } from "./tool-specs";

const ENDPOINT = process.env.FREE_AI_URL?.trim() || "https://text.pollinations.ai/openai";
const MODEL = "openai-fast";

/**
 * GPT-OSS réfléchit avant d'écrire, et sa réflexion compte dans la limite de
 * sortie : sans ces réglages, la série de 7 épisodes épuisait la limite avant
 * la moindre réponse.
 */
const MAX_OUTPUT_TOKENS = 16_000;
const REASONING_EFFORT = "low";

const MAX_ATTEMPTS = 3;
/** Budget total, sous le maxDuration de la route (300 s). */
const TOTAL_BUDGET_MS = 240_000;
const REQUEST_TIMEOUT_MS = 150_000;
const DEFAULT_WAIT_SECONDS = 30;
/**
 * Attente imposée acceptée sans rien dire (45 s par essai, 60 s au total).
 * Au-delà, mieux vaut prévenir tout de suite que laisser l'utilisateur devant
 * un chargement de plusieurs minutes.
 */
const MAX_SINGLE_WAIT_MS = 45_000;
const MAX_TOTAL_WAIT_MS = 60_000;

export type FreeEngineErrorCode = "busy" | "unavailable";

/** Le générateur gratuit est saturé ou injoignable : réessayable plus tard. */
export class FreeEngineError extends Error {
  constructor(
    readonly code: FreeEngineErrorCode,
    message: string,
    /** Délai annoncé par le service avant le prochain créneau libre, si connu. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "FreeEngineError";
  }
}

/** Consigne de format ajoutée au prompt système : le modèle doit répondre en JSON. */
function jsonInstructions(schema: z.ZodType): string {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return [
    "Format de réponse : un unique objet JSON valide, conforme à ce schéma JSON.",
    "Aucun texte avant ou après, pas de bloc de code. Toutes les valeurs texte sont en français.",
    JSON.stringify(jsonSchema),
  ].join("\n");
}

/** Extrait l'objet JSON d'une réponse, même entourée de texte ou d'un bloc de code. */
function parseJsonObject(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** Délai demandé par l'en-tête Retry-After (secondes ou date HTTP), en millisecondes. */
function retryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");
  const seconds = header == null ? NaN : Number(header);
  const value = Number.isFinite(seconds)
    ? seconds
    : header
      ? (Date.parse(header) - Date.now()) / 1000
      : DEFAULT_WAIT_SECONDS;
  return Math.max(1, Math.ceil(Number.isFinite(value) ? value : DEFAULT_WAIT_SECONDS)) * 1000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ChatCompletion = {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: string | null } }>;
};

/**
 * Lance l'outil demandé sur le générateur gratuit et renvoie un résultat
 * validé. Réessaie seul après une attente imposée ou une réponse mal formée.
 */
export async function generateWithFreeEngine(
  request: GenerateRequest,
  profile?: CreatorProfile | null,
): Promise<ToolOutputs[GenerateRequest["tool"]]> {
  const spec = getToolSpec(request, profile);
  const messages = [
    { role: "system", content: `${spec.system}\n\n${jsonInstructions(spec.schema)}` },
    { role: "user", content: spec.user },
  ];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let waited = 0;

  let lastError: Error = new FreeEngineError("busy", "Le générateur gratuit est saturé.");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 5_000) break;

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          reasoning_effort: REASONING_EFFORT,
          response_format: { type: "json_object" },
          // Une graine différente à chaque essai : le service met en cache les
          // requêtes identiques, et une relance doit donner un nouveau résultat.
          seed: Math.floor(Math.random() * 1_000_000_000),
        }),
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining)),
        cache: "no-store",
      });
    } catch (error) {
      console.warn("[free-engine] requête impossible", error);
      lastError = new FreeEngineError("unavailable", "Le générateur gratuit ne répond pas.");
      await sleep(2_000);
      continue;
    }

    // Limite atteinte (402), service saturé (429) ou en panne (5xx) : on patiente.
    if (response.status === 402 || response.status === 429 || response.status >= 500) {
      const wait = response.status >= 500 ? 3_000 : retryAfterMs(response);
      lastError = new FreeEngineError("busy", "Le générateur gratuit est saturé.", Math.ceil(wait / 1000));
      console.warn(`[free-engine] HTTP ${response.status}, prochain créneau dans ${Math.ceil(wait / 1000)} s`);
      // Attente trop longue, ou essai suivant hors budget : on prévient tout de suite.
      if (wait > MAX_SINGLE_WAIT_MS || waited + wait > MAX_TOTAL_WAIT_MS) break;
      if (deadline - Date.now() - wait < 30_000) break;
      waited += wait;
      await sleep(wait);
      continue;
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      // Limite de sortie épuisée par la réflexion du modèle : un nouvel essai
      // (nouvelle graine) aboutit en général.
      if (detail.includes("output_token_limit_exceeded")) {
        lastError = new GenerationError("truncated", "La réponse du générateur a été coupée.");
        continue;
      }
      throw new FreeEngineError("unavailable", `Le générateur a répondu ${response.status} : ${detail}`);
    }

    const body = (await response.json().catch(() => null)) as ChatCompletion | null;
    const choice = body?.choices?.[0];
    if (choice?.finish_reason === "content_filter") {
      throw new GenerationError("refused", "Le générateur a refusé cette demande.");
    }

    const parsed = spec.schema.safeParse(parseJsonObject(choice?.message?.content ?? ""));
    if (parsed.success) {
      try {
        return finalizeOutput(request.tool, parsed.data as ToolOutputs[GenerateRequest["tool"]]);
      } catch (error) {
        if (!(error instanceof GenerationError)) throw error;
        lastError = error;
        continue;
      }
    }

    // Réponse coupée ou mal formée : on relance.
    lastError =
      choice?.finish_reason === "length"
        ? new GenerationError("truncated", "La réponse du générateur a été coupée.")
        : new GenerationError("invalid_output", "La réponse du générateur était incomplète.");
  }

  throw lastError;
}
