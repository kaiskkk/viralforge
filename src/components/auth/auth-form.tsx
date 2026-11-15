"use client";

import { ArrowLeft, CircleAlert, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import {
  login,
  resendSignupCode,
  signup,
  verifySignupCode,
  type AuthState,
} from "@/app/(auth)/actions";
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

/** Écran de saisie du code à 6 chiffres reçu par e-mail. */
function VerifyStep({ email, next }: { email: string; next?: string }) {
  const [state, action] = useFormState<AuthState, FormData>(verifySignupCode, {});
  const [resend, resendAction] = useFormState<AuthState, FormData>(resendSignupCode, {});

  return (
    <div className="hairline rounded-2xl bg-surface/90 p-7 backdrop-blur">
      <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Vérifie ton e-mail</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        On a envoyé un code à 6 chiffres à <span className="text-fg">{email}</span>. Entre-le pour activer ton compte.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="email" value={email} />
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <Label htmlFor="code">Code de vérification</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-[0.5em]"
            required
            autoFocus
          />
        </div>

        {state.error && (
          <p role="alert" className="flex gap-2 text-[13px] leading-relaxed text-danger">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}
        {resend.notice && (
          <p role="status" className="flex gap-2 text-[13px] leading-relaxed text-accent">
            <MailCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {resend.notice}
          </p>
        )}

        <SubmitButton label="Vérifier et continuer" pendingLabel="Vérification…" />
      </form>

      <div className="mt-5 flex items-center justify-between text-[13px]">
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <button type="submit" className="text-muted underline-offset-4 hover:text-fg hover:underline">
            Renvoyer le code
          </button>
        </form>
        <Link href="/signup" className="inline-flex items-center gap-1.5 text-muted underline-offset-4 hover:text-fg hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden />
          Changer d&apos;adresse
        </Link>
      </div>
    </div>
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

  // L'inscription attend un code : on bascule sur l'écran de vérification.
  if (state.verifyEmail) {
    return <VerifyStep email={state.verifyEmail} next={next} />;
  }

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
