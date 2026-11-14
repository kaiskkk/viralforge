"use client";

import { Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { hasMilestone } from "@/lib/handoff";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "viralforge:checklist-dismissed";

type Step = { id: string; label: string; hint: string; href: string; done: boolean };

/**
 * Premiers pas : le compte créé compte déjà comme une étape franchie, et
 * chaque étape mène à un outil. Se masque une fois tout fait, ou à la demande.
 */
export function OnboardingChecklist({
  profileDone,
  generatedDone,
  journalDone,
}: {
  profileDone: boolean;
  generatedDone: boolean;
  journalDone: boolean;
}) {
  const [retentionDone, setRetentionDone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setRetentionDone(hasMilestone("retention"));
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const steps: Step[] = [
    { id: "account", label: "Créer ton compte", hint: "C'est fait.", href: "/dashboard", done: true },
    {
      id: "profile",
      label: "Remplir ton profil créateur",
      hint: "30 secondes : tous les outils écriront dans ta voix.",
      href: "/dashboard/profile",
      done: profileDone,
    },
    {
      id: "retention",
      label: "Tester un script dans la Courbe de rétention",
      hint: "Vois à quelle seconde les gens décrochent. Gratuit et illimité.",
      href: "/dashboard/retention",
      done: retentionDone,
    },
    {
      id: "generate",
      label: "Générer ton premier script avec l'IA",
      hint: "Le Blueprint part d'une vidéo qui a marché.",
      href: "/dashboard#blueprint",
      done: generatedDone,
    },
    {
      id: "journal",
      label: "Noter une vidéo publiée dans le Journal",
      hint: "Tes vrais chiffres : la base de tes tendances.",
      href: "/dashboard/journal",
      done: journalDone,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  if (dismissed || doneCount === steps.length) return null;
  const next = steps.find((step) => !step.done);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sans stockage, la liste reviendra au prochain chargement.
    }
  }

  return (
    <section aria-labelledby="checklist-title" className="hairline rounded-2xl bg-surface p-5 sm:p-6" data-testid="onboarding-checklist">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="checklist-title" className="text-[15px] font-semibold tracking-tight">
            Tes premiers pas : {doneCount} / {steps.length}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {next ? `Prochaine étape : ${next.label.toLowerCase()}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-fg"
          aria-label="Masquer les premiers pas"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <ol className="mt-4 space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
                step.done ? "pointer-events-none" : "hover:bg-white/[0.04]",
                step === next && "bg-white/[0.03]",
              )}
              aria-disabled={step.done || undefined}
              tabIndex={step.done ? -1 : undefined}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  step.done ? "border-accent bg-accent text-black" : "border-white/[0.16] text-transparent",
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[14px]", step.done ? "text-muted line-through decoration-white/20" : "font-medium text-fg")}>
                  {step.label}
                  <span className="sr-only">{step.done ? " (fait)" : " (à faire)"}</span>
                </span>
                {!step.done && <span className="block text-[12px] text-faint">{step.hint}</span>}
              </span>
              {!step.done && <ChevronRight className="size-4 shrink-0 text-faint group-hover:text-fg" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
