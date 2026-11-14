"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "ready" | "invalid" | "done";

/**
 * Choix d'un nouveau mot de passe après un lien de récupération. Le client
 * navigateur lit automatiquement les jetons de l'URL (`?code=` ou `#...`) et
 * ouvre une session de récupération : on demande alors le nouveau mot de passe,
 * sans avoir à connaître l'ancien.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient>>();

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    const markReady = () => setPhase((current) => (current === "done" ? current : "ready"));

    // Le client lit les jetons de l'URL au démarrage : on écoute l'ouverture
    // de session (récupération), et on vérifie aussi une session déjà posée.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // Secours : certains liens déposent les jetons dans le fragment d'URL
    // (#access_token=…&refresh_token=…). On ouvre alors la session à la main.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data }) => {
        if (data.session) markReady();
      });
    }

    // Sans session de récupération au bout de quelques secondes : lien expiré.
    const timer = setTimeout(() => setPhase((current) => (current === "loading" ? "invalid" : current)), 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("Changement impossible. Le lien a peut-être expiré : redemande un e-mail.");
      return;
    }
    setPhase("done");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return (
    <div className="hairline rounded-2xl bg-surface/90 p-7 backdrop-blur">
      {phase === "loading" && (
        <p className="flex items-center gap-3 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden />
          Vérification du lien…
        </p>
      )}

      {phase === "invalid" && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Lien invalide ou expiré</h1>
          <p className="mt-2 flex gap-2 text-sm leading-relaxed text-muted">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            Ce lien de réinitialisation ne fonctionne plus. Redemande-en un nouveau.
          </p>
          <Link href="/forgot-password" className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
            Recevoir un nouveau lien
          </Link>
        </div>
      )}

      {phase === "done" && (
        <div className="flex gap-3 rounded-xl border border-accent/25 bg-accent/[0.07] p-4 text-sm leading-relaxed">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p role="status">Mot de passe mis à jour. Redirection vers ton tableau de bord…</p>
        </div>
      )}

      {phase === "ready" && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Choisis un nouveau mot de passe</h1>
          <p className="mt-1.5 text-sm text-muted">Tu seras connecté juste après.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                minLength={8}
                required
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="flex gap-2 text-[13px] leading-relaxed text-danger">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <Button type="submit" disabled={saving} className="h-11 w-full">
              {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              Enregistrer le nouveau mot de passe
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
