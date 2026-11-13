import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Modèle utilisé par les trois outils. Claude Sonnet 5.5 par défaut ;
 * `claude-haiku-5-5` est l'option plus rapide et moins chère.
 */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

let client: Anthropic | undefined;

/** Client Anthropic partagé. La clé est lue dans ANTHROPIC_API_KEY. */
export function getAnthropic(): Anthropic {
  // 120 s × 2 tentatives reste sous le maxDuration de la route (300 s) :
  // un appel trop long échoue proprement, et le crédit est remboursé.
  client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 });
  return client;
}
