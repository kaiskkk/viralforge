/**
 * Ce que chaque outil demande au modèle, et comment sa réponse est finalisée.
 * Partagé entre le générateur gratuit et Claude.
 */

import type { z } from "zod";

import type { CreatorProfile } from "@/lib/profile";
import { startsWithSlowOpener, stripLeadingGreetings } from "@/lib/viral-score";

import {
  antiDropoffOutputSchema,
  BLUEPRINT_MIN_STEPS,
  blueprintModelSchema,
  cloneOutputSchema,
  HOOKS_COUNT,
  HOOKS_MIN,
  hooksOutputSchema,
  SERIES_LENGTH,
  NO_VIDEO_SOURCE,
  seriesOutputSchema,
  type GenerateRequest,
  type GenerationContext,
  type ToolModelOutputs,
  type ToolOutputs,
} from "@/lib/tools";

import {
  ANTI_DROPOFF_SYSTEM,
  BLUEPRINT_SYSTEM,
  buildAntiDropoffMessage,
  buildBlueprintMessage,
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

export function getToolSpec(
  request: GenerateRequest,
  profile?: CreatorProfile | null,
  context: GenerationContext = {},
): ToolSpec {
  const spec = baseToolSpec(request, context);
  return { ...spec, user: spec.user + buildProfileBlock(profile) };
}

function baseToolSpec(request: GenerateRequest, context: GenerationContext): ToolSpec {
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
    case "blueprint":
      return {
        system: BLUEPRINT_SYSTEM,
        user: buildBlueprintMessage(request.input, context.video),
        schema: blueprintModelSchema,
      };
  }
}

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Dernières vérifications sur une réponse déjà conforme au schéma : scores
 * bornés, série de 7 épisodes numérotés, source du Blueprint ajoutée.
 */
export function finalizeOutput<Tool extends GenerateRequest["tool"]>(
  tool: Tool,
  output: ToolModelOutputs[Tool],
  context: GenerationContext = {},
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

  if (tool === "blueprint") {
    const result = output as ToolModelOutputs["blueprint"];
    const timeline = result.timeline.filter((step) => step.spoken.trim() || step.visual.trim());
    if (timeline.length < BLUEPRINT_MIN_STEPS || !result.script.trim()) {
      throw new GenerationError("invalid_output", `Blueprint incomplet (${timeline.length} étapes).`);
    }
    return {
      ...result,
      viralScore: clampScore(result.viralScore),
      triggers: result.triggers.map((trigger) => trigger.trim()).filter(Boolean).slice(0, 5),
      timeline,
      script: stripLeadingGreetings(result.script),
      source: context.video ?? NO_VIDEO_SOURCE,
    } as ToolOutputs[Tool];
  }

  return output as ToolOutputs[Tool];
}
