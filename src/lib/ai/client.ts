import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Où tournent les générations :
 *
 * - "browser" (par défaut) : le navigateur du visiteur appelle directement le
 *   générateur gratuit (src/lib/ai/free-engine.ts). Aucune clé, aucun coût pour
 *   le site, et la limite de débit s'applique à chaque visiteur séparément.
 * - "server" : dès que ANTHROPIC_API_KEY contient une vraie clé, le serveur
 *   appelle Claude. Meilleure qualité, facturée à l'usage sur ton compte.
 */
export type AiEngine = "browser" | "server";

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
  return getAnthropicApiKey() ? "server" : "browser";
}

let anthropic: Anthropic | undefined;

/** Client Anthropic partagé. La clé est lue dans ANTHROPIC_API_KEY. */
export function getAnthropic(): Anthropic {
  // 120 s × 2 tentatives reste sous le maxDuration de la route (300 s) :
  // un appel trop long échoue proprement, et le crédit est remboursé.
  anthropic ??= new Anthropic({ apiKey: getAnthropicApiKey(), timeout: 120_000, maxRetries: 1 });
  return anthropic;
}
