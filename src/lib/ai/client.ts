import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Quel modèle écrit les scripts :
 *
 * - "free" (par défaut) : le générateur gratuit (src/lib/ai/free-engine.ts).
 *   Aucune clé, aucun coût, mais une limite de débit partagée par tout le site.
 * - "claude" : dès que ANTHROPIC_API_KEY contient une vraie clé. Meilleure
 *   qualité, sans file d'attente, facturée à l'usage sur ton compte Anthropic.
 */
export type AiEngine = "free" | "claude";

/**
 * Modèle Claude utilisé côté serveur. Claude Haiku 5.5 par défaut : rapide et
 * environ vingt fois moins cher que Sonnet. Pour privilégier la qualité
 * d'écriture, définir ANTHROPIC_MODEL=claude-sonnet-5-5.
 */
export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";

/**
 * Le repli côté serveur (rejouer une requête déclinée à tort sur un autre
 * modèle) n'existe pas pour les modèles Haiku.
 */
export const SUPPORTS_REFUSAL_FALLBACK = !MODEL.startsWith("claude-haiku");

/** Clé Anthropic, ou null si ANTHROPIC_API_KEY est absente ou n'en est pas une. */
export function getAnthropicApiKey(): string | null {
  // Un espace ou un retour à la ligne collé avec la clé la rendrait invalide.
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key?.startsWith("sk-ant-") ? key : null;
}

export function getAiEngine(): AiEngine {
  return getAnthropicApiKey() ? "claude" : "free";
}

let anthropic: Anthropic | undefined;

/** Client Anthropic partagé. La clé est lue dans ANTHROPIC_API_KEY. */
export function getAnthropic(): Anthropic {
  // 120 s × 2 tentatives reste sous le maxDuration de la route (300 s) :
  // un appel trop long échoue proprement, et le crédit est remboursé.
  anthropic ??= new Anthropic({ apiKey: getAnthropicApiKey(), timeout: 120_000, maxRetries: 1 });
  return anthropic;
}
