"use client";

import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending ? "Envoi…" : "Envoyer le lien"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <div className="hairline rounded-2xl bg-surface/90 p-7 backdrop-blur">
      <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <p className="mt-1.5 text-sm text-muted">
        Entre ton adresse e-mail : on t&apos;envoie un lien pour en choisir un nouveau.
      </p>

      {state.notice ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-accent/25 bg-accent/[0.07] p-4 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p role="status">{state.notice}</p>
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="toi@exemple.com" required />
          </div>
          {state.error && (
            <p role="alert" className="flex gap-2 text-[13px] leading-relaxed text-danger">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
