"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

export type AuthState = {
  error?: string;
  notice?: string;
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères.")
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères."),
});

const NOT_CONFIGURED =
  "Supabase n'est pas configuré : renseigne les variables de .env.local puis relance le serveur.";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed: "Confirme ton adresse e-mail avant de te connecter.",
  user_already_exists: "Un compte existe déjà avec cet e-mail.",
  email_exists: "Un compte existe déjà avec cet e-mail.",
  weak_password: "Mot de passe trop faible : choisis-en un plus long ou plus varié.",
  signup_disabled: "Les inscriptions sont momentanément fermées.",
  over_request_rate_limit: "Trop de tentatives. Réessaie dans quelques minutes.",
  over_email_send_rate_limit: "Trop d'e-mails envoyés. Réessaie dans quelques minutes.",
};

function describeError(error: { code?: string }): string {
  return (error.code && ERROR_MESSAGES[error.code]) || "Une erreur est survenue. Réessaie.";
}

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? headers().get("origin") ?? "http://localhost:3000";
}

export async function login(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) return { error: describeError(error) };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const next = safeNextPath(formData.get("next"));
  const { data, error } = await createClient().auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: describeError(error) };

  // Sans session, la confirmation par e-mail est activée dans Supabase.
  if (!data.session) {
    return {
      notice: "Compte créé. Clique sur le lien reçu par e-mail pour l'activer.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}
