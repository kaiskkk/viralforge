import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  auth: "Ce lien de confirmation est invalide ou a expiré. Connecte-toi ou recommence l'inscription.",
  config:
    "Supabase n'est pas configuré : renseigne les variables de .env.local puis relance le serveur.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ? safeNextPath(searchParams.next) : undefined;
  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;

  return <AuthForm mode="login" next={next} initialError={error} />;
}
