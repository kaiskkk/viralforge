"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

const passwordSchema = z
  .object({
    current: z.string().min(1, "Entre ton mot de passe actuel."),
    next: z
      .string()
      .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères.")
      .max(72, "Le mot de passe ne peut pas dépasser 72 caractères."),
  })
  .refine((data) => data.current !== data.next, {
    path: ["next"],
    message: "Choisis un mot de passe différent de l'actuel.",
  });

/**
 * Change le mot de passe du compte connecté. On revérifie d'abord le mot de
 * passe actuel (Supabase ne le demande pas de lui-même) : un onglet laissé
 * ouvert ne doit pas suffire à le changer.
 */
export async function changePassword(input: { current: string; next: string }): Promise<Result> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Vérifie les champs." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (reauth) return { ok: false, error: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    console.error("[changePassword]", error);
    return { ok: false, error: "Changement impossible. Réessaie." };
  }

  return { ok: true, message: "Mot de passe mis à jour." };
}

const WHOP_API = "https://api.whop.com/api/v2/memberships";

/**
 * Résilie l'abonnement Pro à la fin de la période en cours (l'accès reste actif
 * jusque-là). Appelle l'API Whop avec WHOP_API_KEY ; sans cette clé, renvoie le
 * code « manual » pour que l'interface propose la gestion sur Whop.
 */
export async function cancelSubscription(): Promise<
  { ok: true; message: string } | { ok: false; error: string; code?: "manual" }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const { data: row } = await supabase
    .from("users")
    .select("plan, billing_provider, billing_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (row?.plan !== "pro") return { ok: false, error: "Aucun abonnement actif sur ce compte." };

  const apiKey = process.env.WHOP_API_KEY?.trim();
  const membershipId = row.billing_subscription_id;

  if (!apiKey || row.billing_provider !== "whop" || !membershipId) {
    return {
      ok: false,
      code: "manual",
      error: "La résiliation en un clic n'est pas encore branchée. Tu peux résilier sur Whop en quelques secondes.",
    };
  }

  try {
    const response = await fetch(`${WHOP_API}/${encodeURIComponent(membershipId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_period_end: true }),
    });
    if (!response.ok) {
      console.error("[cancelSubscription] Whop", response.status, await response.text().catch(() => ""));
      return {
        ok: false,
        code: "manual",
        error: "La résiliation automatique a échoué. Tu peux résilier sur Whop directement.",
      };
    }
  } catch (error) {
    console.error("[cancelSubscription]", error);
    return { ok: false, code: "manual", error: "Connexion à Whop impossible. Réessaie, ou résilie sur Whop." };
  }

  revalidatePath("/dashboard/settings");
  return {
    ok: true,
    message: "Résiliation programmée. Ton accès Pro reste actif jusqu'à la fin de la période déjà payée.",
  };
}
