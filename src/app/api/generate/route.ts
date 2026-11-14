import { fail } from "@/lib/generate-api";
import { handleGeneration } from "@/lib/generation-handler";

export const runtime = "nodejs";
// Une génération peut durer plusieurs dizaines de secondes, file d'attente comprise.
export const maxDuration = 300;

/**
 * POST /api/generate
 * Corps : { tool: "clone" | "antidropoff" | "series" | "hooks" | "blueprint", input: {...} }
 * Réponse : { result, plan, credits } (voir src/lib/generation-handler.ts).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_request", "Requête illisible.");
  }
  return handleGeneration(body);
}
