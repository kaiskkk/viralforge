import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";

export type Viewer = {
  id: string;
  email: string;
  plan: Plan;
  credits: number;
};

/**
 * Utilisateur connecté, avec son plan et son solde. Mis en cache pour la durée
 * de la requête : layout et page peuvent l'appeler sans doubler les requêtes.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, credits] = await Promise.all([
    supabase.from("users").select("plan").eq("id", user.id).maybeSingle(),
    supabase.from("credits").select("balance").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    plan: profile.data?.plan === "pro" ? "pro" : "free",
    credits: credits.data?.balance ?? 0,
  };
});

/** Comme getViewer, mais redirige vers /login si personne n'est connecté. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
