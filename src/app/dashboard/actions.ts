"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  antiDropoffInputSchema,
  antiDropoffOutputSchema,
  cloneInputSchema,
  cloneOutputSchema,
  seriesInputSchema,
  seriesOutputSchema,
} from "@/lib/tools";
import type { Json } from "@/types/database";

const title = z.string().trim().min(1).max(200);

// Entrée et sortie sont revalidées : une Server Action est un point d'entrée
// public, son argument ne peut pas être supposé conforme.
const saveSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("clone"), title, input: cloneInputSchema, output: cloneOutputSchema }),
  z.object({
    tool: z.literal("antidropoff"),
    title,
    input: antiDropoffInputSchema,
    output: antiDropoffOutputSchema,
  }),
  z.object({ tool: z.literal("series"), title, input: seriesInputSchema, output: seriesOutputSchema }),
]);

export type SaveScriptPayload = z.input<typeof saveSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveScript(payload: SaveScriptPayload): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Contenu invalide." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const { error } = await supabase.from("saved_scripts").insert({
    user_id: user.id,
    tool: parsed.data.tool,
    title: parsed.data.title,
    input: parsed.data.input as Json,
    output: parsed.data.output as Json,
  });
  if (error) {
    console.error("[saveScript]", error);
    return { ok: false, error: "Sauvegarde impossible. Réessaie." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saved");
  return { ok: true };
}

export async function deleteScript(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Identifiant invalide." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  // Le RLS limite déjà la suppression à ses propres lignes ; le filtre
  // user_id rend l'intention explicite.
  const { error } = await supabase.from("saved_scripts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[deleteScript]", error);
    return { ok: false, error: "Suppression impossible. Réessaie." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saved");
  return { ok: true };
}
