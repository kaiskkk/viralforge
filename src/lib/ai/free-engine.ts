/**
 * Générateur gratuit, appelé depuis le navigateur du visiteur.
 *
 * Il utilise l'API publique de Pollinations (https://text.pollinations.ai) :
 * pas de clé, pas de compte, pas de coût. La limite de débit est appliquée par
 * adresse IP, c'est-à-dire à chaque visiteur séparément (une génération à la
 * fois, environ 30 secondes entre deux) : le site n'a pas de plafond global.
 *
 * Service gratuit « au mieux » : il peut être lent ou momentanément saturé.
 * Pour une qualité supérieure, renseigne ANTHROPIC_API_KEY sur le serveur :
 * les outils passent alors automatiquement par Claude.
 */

import { z } from "zod";

import type { GenerateRequest, ToolOutputs } from "@/lib/tools";

import { finalizeOutput, GenerationError, getToolSpec } from "./tool-specs";

const ENDPOINT = process.env.NEXT_PUBLIC_FREE_AI_URL || "https://text.pollinations.ai/openai";
const MODEL = "openai-fast";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 180_000;
/** Attente maximale acceptée quand le service demande de patienter. */
const MAX_WAIT_SECONDS = 90;
const DEFAULT_WAIT_SECONDS = 30;

export type FreeEngineErrorCode = "busy" | "network" | "refused" | "truncated" | "invalid_output";

export class FreeEngineError extends Error {
  constructor(
    readonly code: FreeEngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FreeEngineError";
  }
}

export type FreeEngineOptions = {
  /** Appelé chaque seconde pendant une attente imposée (0 quand elle se termine). */
  onWait?: (secondsLeft: number) => void;
  signal?: AbortSignal;
};

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

/** Délai demandé par l'en-tête Retry-After (secondes ou date HTTP). */
function retryAfterSeconds(response: Response): number {
  const header = response.headers.get("retry-after");
  if (!header) return DEFAULT_WAIT_SECONDS;
  const seconds = Number(header);
  const value = Number.isFinite(seconds) ? seconds : (Date.parse(header) - Date.now()) / 1000;
  return Number.isFinite(value) ? Math.min(MAX_WAIT_SECONDS, Math.max(1, Math.ceil(value))) : DEFAULT_WAIT_SECONDS;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

async function countdown(seconds: number, options: FreeEngineOptions): Promise<void> {
  for (let left = seconds; left > 0; left--) {
    options.onWait?.(left);
    await sleep(1000, options.signal);
  }
  options.onWait?.(0);
}

type ChatCompletion = {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: string | null } }>;
};

/**
 * Lance l'outil demandé sur le générateur gratuit et renvoie un résultat
 * validé. Réessaie seul après une attente imposée ou une réponse mal formée.
 */
export async function generateInBrowser<Tool extends GenerateRequest["tool"]>(
  request: Extract<GenerateRequest, { tool: Tool }>,
  options: FreeEngineOptions = {},
): Promise<ToolOutputs[Tool]> {
  const spec = getToolSpec(request);
  const messages = [
    { role: "system", content: `${spec.system}\n\n${jsonInstructions(spec.schema)}` },
    { role: "user", content: spec.user },
  ];

  let lastError = new FreeEngineError("busy", "Le générateur gratuit ne répond pas.");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isLastAttempt = attempt === MAX_ATTEMPTS;

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          response_format: { type: "json_object" },
          // Une graine différente à chaque essai : le service met en cache les
          // requêtes identiques, et une relance doit donner un nouveau résultat.
          seed: Math.floor(Math.random() * 1_000_000_000),
        }),
        signal: options.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
          : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      lastError = new FreeEngineError("network", "Connexion au générateur interrompue.");
      if (isLastAttempt) throw lastError;
      await sleep(3000, options.signal);
      continue;
    }

    // Limite par visiteur atteinte (402) ou service saturé (429, 5xx) : on patiente.
    if (response.status === 402 || response.status === 429 || response.status >= 500) {
      lastError = new FreeEngineError("busy", "Le générateur gratuit est saturé.");
      if (isLastAttempt) throw lastError;
      await countdown(response.status >= 500 ? 5 : retryAfterSeconds(response), options);
      continue;
    }
    if (!response.ok) {
      throw new FreeEngineError("network", `Le générateur a répondu ${response.status}.`);
    }

    const body = (await response.json().catch(() => null)) as ChatCompletion | null;
    const choice = body?.choices?.[0];
    if (choice?.finish_reason === "content_filter") {
      throw new FreeEngineError("refused", "Le générateur a refusé cette demande.");
    }

    const parsed = spec.schema.safeParse(parseJsonObject(choice?.message?.content ?? ""));
    if (parsed.success) {
      try {
        return finalizeOutput(request.tool as Tool, parsed.data as ToolOutputs[Tool]);
      } catch (error) {
        if (!(error instanceof GenerationError)) throw error;
      }
    }

    // Réponse coupée ou mal formée : on relance (au prochain créneau libre).
    lastError =
      choice?.finish_reason === "length"
        ? new FreeEngineError("truncated", "La réponse du générateur a été coupée.")
        : new FreeEngineError("invalid_output", "La réponse du générateur était incomplète.");
    if (isLastAttempt) throw lastError;
  }

  throw lastError;
}
