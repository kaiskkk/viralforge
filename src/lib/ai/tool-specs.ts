/**
 * Ce que chaque outil demande au modèle, et comment sa réponse est finalisée.
 * Partagé entre le générateur gratuit et Claude.
 */

import type { z } from "zod";

import type { CreatorProfile } from "@/lib/profile";
import { startsWithSlowOpener, stripLeadingGreetings } from "@/lib/viral-score";

import {
  antiDropoffOutputSchema,
  cloneOutputSchema,
  HOOKS_COUNT,
  HOOKS_MIN,
  hooksOutputSchema,
  SERIES_LENGTH,
  seriesOutputSchema,
  type GenerateRequest,
  type ToolOutputs,
} from "@/lib/tools";

import {
  ANTI_DROPOFF_SYSTEM,
  buildAntiDropoffMessage,
  buildCloneMessage,
  buildHooksMessage,
  buildProfileBlock,
  buildSeriesMessage,
  CLONE_SYSTEM,
  HOOKS_SYSTEM,
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

export function getToolSpec(request: GenerateRequest, profile?: CreatorProfile | null): ToolSpec {
  const spec = baseToolSpec(request);
  return { ...spec, user: spec.user + buildProfileBlock(profile) };
}

function baseToolSpec(request: GenerateRequest): ToolSpec {
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
    case "hooks":
      return { system: HOOKS_SYSTEM, user: buildHooksMessage(request.input), schema: hooksOutputSchema };
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
    // Filet de sécurité : une ouverture « Salut… » ou « Aujourd'hui je vais… » est
    // toujours un décrochage, et sa réécriture ne doit pas être une autre salutation.
    const segments = result.segments.map((segment, index) => {
      if (index > 0 || !startsWithSlowOpener(segment.text)) return segment;
      const weakRewrite = !segment.rewrite || startsWithSlowOpener(segment.rewrite);
      return {
        ...segment,
        status: "critical" as const,
        reason: weakRewrite
          ? "Formule d'accueil : la première seconde est perdue. Supprime-la et ouvre directement sur ta phrase la plus forte."
          : (segment.reason ?? "Formule d'accueil : la première seconde est perdue avant même le sujet."),
        rewrite: weakRewrite ? null : segment.rewrite,
      };
    });
    return {
      ...result,
      segments,
      improvedScript: stripLeadingGreetings(result.improvedScript),
      retentionScore: clampScore(result.retentionScore),
    } as ToolOutputs[Tool];
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

  if (tool === "hooks") {
    const result = output as ToolOutputs["hooks"];
    // Doublons écartés (même texte à la casse et à la ponctuation près).
    const seen = new Set<string>();
    const hooks = result.hooks.filter((hook) => {
      const key = hook.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (hooks.length < HOOKS_MIN) {
      throw new GenerationError("invalid_output", `${hooks.length} accroches exploitables seulement.`);
    }
    return { hooks: hooks.slice(0, HOOKS_COUNT) } as ToolOutputs[Tool];
  }

  return output;
}
