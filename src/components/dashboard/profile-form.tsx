"use client";

import { Check, LoaderCircle, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

import { saveProfile } from "@/app/dashboard/actions";
import { useCredits } from "@/components/dashboard/credits-context";
import { Button } from "@/components/ui/button";
import { CharCount, FieldTitle, Input, Label, Textarea } from "@/components/ui/field";
import { EMPTY_PROFILE, PLATFORMS, PROFILE_LIMITS, TONES, type CreatorProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

/** Pastilles de choix rapide ; un second appui sur la pastille active l'efface. */
function Choices({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
              active
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.16] hover:text-fg",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm() {
  const { profile: saved, setProfile } = useCredits();
  const [profile, setLocal] = useState<CreatorProfile>(saved ?? EMPTY_PROFILE);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const update = (key: keyof CreatorProfile) => (value: string) => {
    setLocal((current) => ({ ...current, [key]: value }));
    setStatus(null);
  };

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveProfile(profile);
      if (result.ok) {
        setProfile(result.profile);
        setStatus({ ok: true, message: "Profil enregistré : les outils écrivent maintenant dans ta voix." });
      } else {
        setStatus({ ok: false, message: result.error });
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profil créateur</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Dis à ViralForge qui tu es et pour qui tu crées. Les quatre outils s&apos;en servent pour
            écrire dans ta voix, avec des exemples qui parlent à ton audience.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="hairline space-y-7 rounded-2xl bg-surface p-5 sm:p-7">
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="niche">Ta niche</Label>
            <CharCount value={profile.niche} max={PROFILE_LIMITS.niche} />
          </div>
          <Input
            id="niche"
            value={profile.niche}
            onChange={(event) => update("niche")(event.target.value)}
            maxLength={PROFILE_LIMITS.niche}
            placeholder="Ex. : finances perso pour jeunes actifs"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="audience">Ton audience</Label>
            <CharCount value={profile.audience} max={PROFILE_LIMITS.audience} />
          </div>
          <Input
            id="audience"
            value={profile.audience}
            onChange={(event) => update("audience")(event.target.value)}
            maxLength={PROFILE_LIMITS.audience}
            placeholder="Ex. : 20-30 ans, premier salaire, veulent épargner sans se priver"
          />
        </div>

        <div>
          <FieldTitle>Ton ton</FieldTitle>
          <Choices options={TONES} value={profile.tone} onChange={update("tone")} label="Ton" />
        </div>

        <div>
          <FieldTitle>Ta plateforme principale</FieldTitle>
          <Choices options={PLATFORMS} value={profile.platform} onChange={update("platform")} label="Plateforme" />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="styleNotes">Ton style</Label>
            <CharCount value={profile.styleNotes} max={PROFILE_LIMITS.styleNotes} />
          </div>
          <Textarea
            id="styleNotes"
            value={profile.styleNotes}
            onChange={(event) => update("styleNotes")(event.target.value)}
            maxLength={PROFILE_LIMITS.styleNotes}
            rows={4}
            placeholder="Tes expressions, ta façon de finir une vidéo, ce que tu ne dis jamais… Ex. : je tutoie, je finis toujours par « on se capte demain », jamais de gros mots."
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending} className="h-11 px-6">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Enregistrer mon profil
          </Button>
          {status && (
            <p role="status" className={cn("text-[13px]", status.ok ? "text-accent" : "text-danger")}>
              {status.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
