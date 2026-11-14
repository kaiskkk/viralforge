import "server-only";

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import type { CreatorProfile } from "@/lib/profile";
import type { GenerateRequest, GenerationContext, ToolModelOutputs, ToolOutputs } from "@/lib/tools";

import { getAiEngine, getAnthropic, MODEL, SUPPORTS_REFUSAL_FALLBACK } from "./client";
import { generateWithFreeEngine } from "./free-engine";
import { finalizeOutput, GenerationError, getToolSpec } from "./tool-specs";

export { FreeEngineError } from "./free-engine";
export { GenerationError } from "./tool-specs";

/** Génération côté serveur, avec la clé Anthropic du propriétaire du site. */
async function generateStructured<Schema extends z.ZodType>(options: {
  system: string;
  user: string;
  schema: Schema;
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
      effort: "medium",
      // Sortie structurée : la réponse est garantie conforme au schéma Zod.
      format: betaZodOutputFormat(options.schema),
    },
    // Si le modèle décline une requête à tort (filtre de sécurité), l'API la
    // rejoue sur un modèle de repli dans le même appel, quand le modèle le permet.
    ...(SUPPORTS_REFUSAL_FALLBACK
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
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

/** Exécute l'outil demandé et renvoie son résultat typé. */
export async function runTool(
  request: GenerateRequest,
  profile?: CreatorProfile | null,
  context: GenerationContext = {},
): Promise<ToolOutputs[GenerateRequest["tool"]]> {
  if (getAiEngine() === "free") return generateWithFreeEngine(request, profile, context);
  const output = await generateStructured(getToolSpec(request, profile, context));
  return finalizeOutput(request.tool, output as ToolModelOutputs[typeof request.tool], context);
}
