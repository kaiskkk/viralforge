import "server-only";

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import {
  antiDropoffOutputSchema,
  cloneOutputSchema,
  SERIES_LENGTH,
  seriesOutputSchema,
  type GenerateRequest,
  type ToolOutputs,
} from "@/lib/tools";

import { getAnthropic, MODEL } from "./client";
import {
  ANTI_DROPOFF_SYSTEM,
  buildAntiDropoffMessage,
  buildCloneMessage,
  buildSeriesMessage,
  CLONE_SYSTEM,
  SERIES_SYSTEM,
} from "./prompts";

/** Échec côté modèle (et non côté réseau/API) : la réponse est inexploitable. */
export class GenerationError extends Error {
  constructor(
    readonly code: "refused" | "truncated" | "invalid_output",
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

type Effort = "low" | "medium" | "high";

async function generateStructured<Schema extends z.ZodType>(options: {
  system: string;
  user: string;
  schema: Schema;
  effort: Effort;
}): Promise<z.infer<Schema>> {
  // Streaming côté serveur : évite les timeouts HTTP sur les réponses longues.
  // finalMessage() attend la fin du flux et renvoie le message complet.
  const stream = getAnthropic().beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: options.system,
    messages: [{ role: "user", content: options.user }],
    output_config: {
      // `effort` règle la profondeur de réflexion (latence et coût).
      effort: options.effort,
      // Sortie structurée : la réponse est garantie conforme au schéma Zod.
      format: betaZodOutputFormat(options.schema),
    },
    // Si le modèle décline une requête à tort (filtre de sécurité), l'API la
    // rejoue sur un modèle de repli dans le même appel.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new GenerationError("refused", "Le modèle a décliné cette requête.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new GenerationError("truncated", "La réponse a été tronquée.");
  }
  if (message.parsed_output == null) {
    throw new GenerationError("invalid_output", "Réponse vide ou non conforme.");
  }

  return message.parsed_output;
}

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/** Exécute l'outil demandé et renvoie son résultat typé. */
export async function runTool(request: GenerateRequest): Promise<ToolOutputs[GenerateRequest["tool"]]> {
  switch (request.tool) {
    case "clone":
      return generateStructured({
        system: CLONE_SYSTEM,
        user: buildCloneMessage(request.input),
        schema: cloneOutputSchema,
        effort: "medium",
      });

    case "antidropoff": {
      const result = await generateStructured({
        system: ANTI_DROPOFF_SYSTEM,
        user: buildAntiDropoffMessage(request.input),
        schema: antiDropoffOutputSchema,
        effort: "medium",
      });
      return { ...result, retentionScore: clampScore(result.retentionScore) };
    }

    case "series": {
      const result = await generateStructured({
        system: SERIES_SYSTEM,
        user: buildSeriesMessage(request.input),
        schema: seriesOutputSchema,
        effort: "medium",
      });
      // Le schéma JSON ne peut pas imposer la longueur du tableau : on vérifie.
      if (result.episodes.length !== SERIES_LENGTH) {
        throw new GenerationError(
          "invalid_output",
          `${result.episodes.length} épisodes reçus au lieu de ${SERIES_LENGTH}.`,
        );
      }
      return {
        ...result,
        episodes: result.episodes.map((episode, index) => ({ ...episode, day: index + 1 })),
      };
    }
  }
}
