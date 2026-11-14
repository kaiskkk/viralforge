"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { JOURNAL_FREE_LIMIT, videoLogFromRow, videoLogInputSchema, type VideoLog, type VideoLogInput } from "@/lib/journal";
import { createClient } from "@/lib/supabase/server";

export type JournalActionResult =
  | { ok: true; log: VideoLog }
  | { ok: false; error: string; code?: "limit" | "setup" };

const COLUMNS = "id, title, platform, hook, published_on, duration_seconds, views, likes, comments, avg_watch_pct";

export async function addVideoLog(input: VideoLogInput): Promise<JournalActionResult> {
  const parsed = videoLogInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Vérifie les champs." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const data = parsed.data;
  const { data: row, error } = await supabase
    .from("video_logs")
    .insert({
      user_id: user.id,
      title: data.title,
      platform: data.platform,
      hook: data.hook,
      published_on: data.publishedOn,
      duration_seconds: data.durationSeconds,
      views: data.views as number,
      likes: data.likes,
      comments: data.comments,
      avg_watch_pct: data.avgWatchPct,
    })
    .select(COLUMNS)
    .single();

  if (error || !row) {
    // 42501 : la règle RLS refuse l'ajout, donc la limite du plan gratuit est atteinte.
    if (error?.code === "42501") {
      return {
        ok: false,
        code: "limit",
        error: `Ton journal gratuit est plein (${JOURNAL_FREE_LIMIT} vidéos). Passe en Pro pour un journal illimité, ou supprime une vidéo.`,
      };
    }
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return { ok: false, code: "setup", error: "Le journal n'est pas encore installé (migration 0007)." };
    }
    console.error("[addVideoLog]", error);
    return { ok: false, error: "Enregistrement impossible. Réessaie." };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard");
  return { ok: true, log: videoLogFromRow(row) };
}

export async function deleteVideoLog(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Identifiant invalide." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const { error } = await supabase.from("video_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[deleteVideoLog]", error);
    return { ok: false, error: "Suppression impossible. Réessaie." };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard");
  return { ok: true };
}
