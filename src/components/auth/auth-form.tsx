"use client";

import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { login, signup, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { FREE_CREDITS } from "@/lib/plans";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Content de te revoir",
    subtitle: "Connecte-toi pour retrouver tes outils et tes scripts.",
    submit: "Se connecter",
    pending: "Connexion…",
    switchText: "Pas encore de compte ?",
    switchLabel: "Créer un compte",
    switchHref: "/signup",
  },
  signup: {
    title: "Crée ton compte",
    subtitle: `${FREE_CREDITS} crédits offerts, sans carte bancaire.`,
    submit: "Créer mon compte",
    pending: "Création…",
    switchText: "Déjà un compte ?",
    switchLabel: "Se connecter",
    switchHref: "/login",
  },
} as const;

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: Mode;
  next?: string;
  initialError?: string;
}) {
  const [state, formAction] = useFormState<AuthState, FormData>(
    mode === "login" ? login : signup,
    { error: initialError },
  );
  const copy = COPY[mode];
  const switchHref = next ? `${copy.switchHref}?next=${encodeURIComponent(next)}` : copy.switchHref;

  return (
    <div className="hairline rounded-2xl bg-surface/90 p-7 backdrop-blur">
      <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

      {state.notice ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-accent/25 bg-accent/[0.07] p-4 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p role="status">{state.notice}</p>
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          {next && <input type="hidden" name="next" value={next} />}

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="toi@exemple.com"
              required
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              {mode === "login" && (
                <Link href="/forgot-password" className="mb-2 text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline">
                  Oublié ?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "8 caractères minimum" : "••••••••"}
              minLength={8}
              required
            />
          </div>

          {state.error && (
            <p role="alert" className="flex gap-2 text-[13px] leading-relaxed text-danger">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          <SubmitButton label={copy.submit} pendingLabel={copy.pending} />
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        {copy.switchText}{" "}
        <Link href={switchHref} className="font-medium text-fg underline-offset-4 hover:underline">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
