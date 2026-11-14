"use client";

import { Check, CircleAlert, ExternalLink, Infinity as InfinityIcon, LoaderCircle, LogOut, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { cancelSubscription, changePassword } from "@/app/dashboard/settings/actions";
import { useCredits } from "@/components/dashboard/credits-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

const WHOP_MANAGE_URL = "https://whop.com/orders";
const PRO_PRICE_FEATURES =
  "les outils de mesure (Courbe de rétention, Studio, Journal de 5 vidéos) restent gratuits, et tu as 3 scripts IA offerts.";

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await changePassword({ current, next });
      if (result.ok) {
        setFeedback({ ok: true, message: result.message });
        setCurrent("");
        setNext("");
      } else {
        setFeedback({ ok: false, message: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader eyebrow="Sécurité" title="Mot de passe" />
      <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
        <div>
          <Label htmlFor="current-password">Mot de passe actuel</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            placeholder="8 caractères minimum"
            minLength={8}
            required
          />
        </div>

        {feedback && (
          <p
            role={feedback.ok ? "status" : "alert"}
            className={`flex items-center gap-2 text-[13px] ${feedback.ok ? "text-accent" : "text-danger"}`}
          >
            {feedback.ok ? <Check className="size-3.5 shrink-0" aria-hidden /> : <CircleAlert className="size-3.5 shrink-0" aria-hidden />}
            {feedback.message}
          </p>
        )}

        <Button type="submit" disabled={pending} className="h-11">
          {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Mettre à jour le mot de passe
        </Button>
      </form>
    </Card>
  );
}

function SubscriptionCard() {
  const { plan, openUpgrade } = useCredits();
  const [state, setState] = useState<"idle" | "confirm" | "done">("idle");
  const [error, setError] = useState<{ message: string; manual: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (plan !== "pro") {
    return (
      <Card>
        <CardHeader eyebrow="Abonnement" title="Plan gratuit" />
        <div className="p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted">
            Tu es sur le plan gratuit : {PRO_PRICE_FEATURES}
          </p>
          <Button onClick={() => openUpgrade("manual")} className="mt-4 h-11">
            <Zap className="size-4" aria-hidden />
            Passer en Pro
          </Button>
        </div>
      </Card>
    );
  }

  function confirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (result.ok) {
        setState("done");
      } else {
        setError({ message: result.error, manual: result.code === "manual" });
        setState("idle");
      }
    });
  }

  return (
    <Card>
      <CardHeader eyebrow="Abonnement" title="Plan Pro" />
      <div className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-accent">
          <InfinityIcon className="size-4" aria-hidden />
          Tout est illimité
        </p>

        {state === "done" ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5 text-[13px] leading-relaxed" role="status">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            Résiliation programmée. Ton accès Pro reste actif jusqu&apos;à la fin de la période déjà payée, puis ton compte
            repasse en gratuit.
          </p>
        ) : state === "confirm" ? (
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[13px] leading-relaxed text-muted">
              Tu gardes l&apos;accès Pro jusqu&apos;à la fin de la période déjà payée. Confirmer la résiliation ?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmCancel}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-danger/40 px-4 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                {pending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                Oui, résilier
              </button>
              <button type="button" onClick={() => setState("idle")} className="h-10 rounded-full px-4 text-[13px] text-muted hover:text-fg">
                Garder Pro
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setState("confirm")}
            className="mt-4 text-[13px] text-muted underline underline-offset-4 transition-colors hover:text-fg"
          >
            Résilier mon abonnement
          </button>
        )}

        {error && (
          <div className="mt-3 text-[13px] text-danger" role="alert">
            <p className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
            {error.manual && (
              <a
                href={WHOP_MANAGE_URL}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-flex items-center gap-1.5 text-muted underline underline-offset-4 hover:text-fg"
              >
                Gérer mon abonnement sur Whop
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function SettingsView({ email }: { email: string }) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">Ton compte, ta sécurité et ton abonnement.</p>
      </header>

      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader eyebrow="Compte" title="Ton adresse e-mail" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <p className="font-mono text-sm text-fg">{email}</p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.1] px-4 text-[13px] text-muted transition-colors hover:text-fg"
              >
                <LogOut className="size-4" aria-hidden />
                Se déconnecter
              </button>
            </form>
          </div>
        </Card>

        <ChangePasswordCard />
        <SubscriptionCard />

        <Link
          href="/dashboard/profile"
          className="hairline flex items-center justify-between gap-3 rounded-2xl bg-surface p-5 transition-colors hover:border-white/[0.16] hover:bg-elevated sm:p-6"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <UserRound className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-tight">Profil créateur</span>
              <span className="block text-[13px] text-muted">Ta niche et ton ton, appliqués à tous les outils IA.</span>
            </span>
          </span>
          <ExternalLink className="size-4 shrink-0 text-faint" aria-hidden />
        </Link>
      </div>
    </>
  );
}
