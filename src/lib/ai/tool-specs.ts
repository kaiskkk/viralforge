/**
 * Ce que chaque outil demande au modèle, et comment sa réponse est finalisée.
 * Partagé entre le générateur gratuit et Claude.
 */

import type { z } from "zod";

import {
  antiDropoffOutputSchema,
  cloneOutputSchema,
  SERIES_LENGTH,
  seriesOutputSchema,
  type GenerateRequest,
  type ToolOutputs,
} from "@/lib/tools";

import {
  ANTI_DROPOFF_SYSTEM,
  buildAntiDropoffMessage,
  buildCloneMessage,
  buildSeriesMessage,
  CLONE_SYSTEM,
  SERIES_SYSTEM,
} from "./prompts";

/** Échec côté modèle (et non côté réseau) : la réponse est inexploitable. */
export class GenerationError extends Error {
  constructor(
    readonly code: "refused" | "truncated" | "invalid_output",
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export type ToolSpec = {
  system: string;
  user: string;
  schema: z.ZodType;
};

export function getToolSpec(request: GenerateRequest): ToolSpec {
  switch (request.tool) {
    case "clone":
      return { system: CLONE_SYSTEM, user: buildCloneMessage(request.input), schema: cloneOutputSchema };
    case "antidropoff":
      return {
        system: ANTI_DROPOFF_SYSTEM,
        user: buildAntiDropoffMessage(request.input),
        schema: antiDropoffOutputSchema,
      };
    case "series":
      return { system: SERIES_SYSTEM, user: buildSeriesMessage(request.input), schema: seriesOutputSchema };
  }
}

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Dernières vérifications sur une réponse déjà conforme au schéma : score
 * borné, série de 7 épisodes numérotés dans l'ordre.
 */
export function finalizeOutput<Tool extends GenerateRequest["tool"]>(
  tool: Tool,
  output: ToolOutputs[Tool],
): ToolOutputs[Tool] {
  if (tool === "antidropoff") {
    const result = output as ToolOutputs["antidropoff"];
    return { ...result, retentionScore: clampScore(result.retentionScore) } as ToolOutputs[Tool];
  }

  if (tool === "series") {
    const result = output as ToolOutputs["series"];
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
    } as ToolOutputs[Tool];
  }

  return output;
}
