"use client";

import { ChartSpline, Infinity as InfinityIcon, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ShootButton } from "@/components/dashboard/shoot-button";
import { RetentionStats, SentenceList, SingleRetentionChart } from "@/components/retention-report";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { CharCount, Label, Textarea } from "@/components/ui/field";
import { markMilestone, sendDraft, takeDraft } from "@/lib/handoff";
import { analyzeRetention, RETENTION_MIN_WORDS } from "@/lib/retention";
import { SCRIPT_MAX_CHARS } from "@/lib/tools";

export const RETENTION_EXAMPLES = {
  weak: "Salut tout le monde, j'espère que vous allez bien. Aujourd'hui je vais vous parler de comment j'ai réussi à économiser de l'argent. En fait, du coup, il faut savoir que pendant longtemps j'avais vraiment beaucoup de mal à mettre de l'argent de côté à la fin du mois. Alors j'ai décidé de faire un budget. Ensuite, j'ai arrêté de commander à manger le soir. Et voilà, en gros c'est ça. N'oubliez pas de vous abonner.",
  strong: "Tu perds 150 € par mois sans t'en rendre compte. Et non, ce n'est pas ton loyer. Ce sont les abonnements que tu as oubliés. Ouvre ton appli bancaire maintenant. Cherche les prélèvements de moins de 15 €. Moi, j'en ai trouvé six. Le pire ? Le dernier, je ne savais même pas ce que c'était. Dis-moi en commentaire combien tu en as trouvé.",
};

export function RetentionTool() {
  const router = useRouter();
  const [script, setScript] = useState("");
  // Le calcul suit la frappe sans la ralentir.
  const deferred = useDeferredValue(script);
  const analysis = useMemo(() => analyzeRetention(deferred), [deferred]);

  // Script envoyé depuis un autre outil.
  useEffect(() => {
    const draft = takeDraft("retention");
    if (draft) setScript(draft);
  }, []);

  useEffect(() => {
    if (analysis) markMilestone("retention");
  }, [analysis]);

  const hasIssues = analysis?.sentences.some((sentence) => sentence.level !== "ok") ?? false;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <ChartSpline className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Courbe de rétention</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Tape ton script : chaque phrase est mesurée en direct, et la courbe montre à quelle seconde
              les spectateurs décrochent. Avant même de tourner.
            </p>
          </div>
        </div>
        <span className="hairline inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1 text-xs text-muted">
          <InfinityIcon className="size-3.5 text-accent" aria-hidden />
          Illimité · gratuit · sans crédit
        </span>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="hairline rounded-2xl bg-surface p-5 sm:p-6 xl:sticky xl:top-8">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="retention-script">Ton script</Label>
            <CharCount value={script} max={SCRIPT_MAX_CHARS} />
          </div>
          <Textarea
            id="retention-script"
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={13}
            maxLength={SCRIPT_MAX_CHARS}
            placeholder="Colle ou tape ton script : la courbe se dessine pendant que tu écris…"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-faint">Essayer :</span>
            <button
              type="button"
              onClick={() => setScript(RETENTION_EXAMPLES.weak)}
              className="hairline rounded-full bg-white/[0.03] px-3 py-1.5 text-muted transition-colors hover:text-fg"
            >
              Un script qui fait fuir
            </button>
            <button
              type="button"
              onClick={() => setScript(RETENTION_EXAMPLES.strong)}
              className="hairline rounded-full bg-white/[0.03] px-3 py-1.5 text-muted transition-colors hover:text-fg"
            >
              Un script qui retient
            </button>
          </div>
          <p className="mt-5 flex gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[12px] leading-relaxed text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
            Calcul fait dans ton navigateur : ton script ne quitte pas ton téléphone. La courbe est une
            estimation tirée de la forme du texte (hook, longueur des phrases, mots de remplissage,
            boucles de curiosité), pas une donnée de TikTok.
          </p>
        </div>

        <div className="min-w-0 space-y-5" aria-live="polite">
          {!analysis ? (
            <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-white/[0.1] p-8 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[0.04] text-faint">
                  <ChartSpline className="size-5" aria-hidden />
                </span>
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted">
                  Écris au moins {RETENTION_MIN_WORDS} mots : la courbe apparaîtra ici, seconde par seconde.
                </p>
              </div>
            </div>
          ) : (
            <>
              <RetentionStats analysis={analysis} />

              <Card>
                <CardHeader eyebrow="Spectateurs encore là, seconde par seconde" title="Ta courbe de rétention estimée" />
                <div className="px-3 py-4 sm:px-5">
                  <SingleRetentionChart analysis={analysis} />
                </div>
              </Card>

              <Card>
                <CardHeader
                  eyebrow="Phrase par phrase"
                  title={hasIssues ? "Les passages qui font décrocher" : "Chaque phrase retient : prêt à tourner"}
                  actions={<ShootButton script={script} title="Script testé" />}
                />
                <div className="p-4 sm:p-5">
                  <SentenceList analysis={analysis} />
                </div>
                {hasIssues && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4 sm:px-6">
                    <p className="text-[13px] text-muted">L&apos;IA réécrit les passages en rouge et orange.</p>
                    <button
                      type="button"
                      onClick={() => {
                        sendDraft("antidropoff", script);
                        router.push("/dashboard/anti-dropoff");
                      }}
                      className={buttonClasses({ size: "sm" })}
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                      Corriger avec l&apos;IA
                    </button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
