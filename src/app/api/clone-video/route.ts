import { fail } from "@/lib/generate-api";
import { handleGeneration } from "@/lib/generation-handler";

export const runtime = "nodejs";
// Lecture de la vidéo (5 s au plus) puis génération, file d'attente comprise.
export const maxDuration = 300;

/**
 * POST /api/clone-video — Video-to-Viral Blueprint
 * Corps : { url: string (TikTok, Reels, Shorts, ou vide), niche: string }
 * Réponse : { result, plan, credits }, où result suit blueprintOutputSchema
 * (score, déclencheurs, découpage seconde par seconde, script, source).
 *
 * Mêmes règles que les autres outils : 1 crédit en plan free, illimité en Pro,
 * aucun crédit débité si la génération échoue.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_request", "Requête illisible.");
  }
  return handleGeneration({ tool: "blueprint", input: body });
}
