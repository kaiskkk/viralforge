"use client";

import { Crown, Infinity as InfinityIcon, Lightbulb, LoaderCircle, Lock, NotebookPen, Plus, Trash2, Trophy, Zap } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { addVideoLog, deleteVideoLog } from "@/app/dashboard/journal/actions";
import { useCredits } from "@/components/dashboard/credits-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FieldTitle, Input, Label } from "@/components/ui/field";
import {
  computeInsights,
  INSIGHTS_MIN_LOGS,
  JOURNAL_FREE_LIMIT,
  summarize,
  VIDEO_PLATFORM_LABELS,
  VIDEO_PLATFORMS,
  type JournalInsight,
  type VideoLog,
  type VideoPlatform,
} from "@/lib/journal";
import { PRO_PRICE_PER_DAY } from "@/lib/plans";
import { cn } from "@/lib/utils";

const NUMBER = new Intl.NumberFormat("fr-FR");
const COMPACT = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

const EMPTY_FORM = {
  title: "",
  hook: "",
  durationSeconds: "",
  views: "",
  likes: "",
  comments: "",
  avgWatchPct: "",
};

function AddVideoForm({ onAdded, full }: { onAdded: (log: VideoLog) => void; full: boolean }) {
  const { openUpgrade } = useCredits();
  const [form, setForm] = useState(EMPTY_FORM);
  const [platform, setPlatform] = useState<VideoPlatform>("tiktok");
  const [publishedOn, setPublishedOn] = useState(today);
  const [error, setError] = useState<{ message: string; limit: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const field = (name: keyof typeof EMPTY_FORM) => ({
    id: `log-${name}`,
    name,
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addVideoLog({ ...form, platform, publishedOn });
      if (result.ok) {
        onAdded(result.log);
        setForm(EMPTY_FORM);
      } else {
        setError({ message: result.error, limit: result.code === "limit" });
      }
    });
  }

  if (full) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="mt-4 text-[15px] font-semibold">Ton journal gratuit est plein</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
          {JOURNAL_FREE_LIMIT} vidéos sur {JOURNAL_FREE_LIMIT}. Plus tu notes de vidéos, plus les tendances sont fiables :
          avec Pro, le journal est illimité.
        </p>
        <Button onClick={() => openUpgrade("journal")} className="mt-5 w-full">
          <Zap className="size-4" aria-hidden />
          Journal illimité avec Pro
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="log-title">Titre de la vidéo</Label>
        <Input {...field("title")} maxLength={200} placeholder="Ex. : Les 3 abonnements que tu as oubliés" required />
      </div>

      <div>
        <FieldTitle>Plateforme</FieldTitle>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Plateforme">
          {VIDEO_PLATFORMS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={platform === value}
              onClick={() => setPlatform(value)}
              className={cn(
                "h-10 rounded-xl border text-[13px] transition-colors",
                platform === value ? "border-accent/50 bg-accent/10 text-fg" : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-fg",
              )}
            >
              {VIDEO_PLATFORM_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="log-hook">
          Hook <span className="font-normal text-faint">(la première phrase dite)</span>
        </Label>
        <Input {...field("hook")} maxLength={300} placeholder="Ex. : Tu perds 150 € par mois sans le savoir" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="log-views">Vues</Label>
          <Input {...field("views")} inputMode="numeric" placeholder="12 400" required />
        </div>
        <div>
          <Label htmlFor="log-published">Publiée le</Label>
          <Input id="log-published" type="date" value={publishedOn} max={today()} onChange={(event) => setPublishedOn(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="log-avgWatchPct">
            Rétention <span className="font-normal text-faint">(%)</span>
          </Label>
          <Input {...field("avgWatchPct")} inputMode="decimal" placeholder="45" />
        </div>
        <div>
          <Label htmlFor="log-durationSeconds">
            Durée <span className="font-normal text-faint">(s)</span>
          </Label>
          <Input {...field("durationSeconds")} inputMode="numeric" placeholder="28" />
        </div>
        <div>
          <Label htmlFor="log-likes">Likes</Label>
          <Input {...field("likes")} inputMode="numeric" placeholder="900" />
        </div>
        <div>
          <Label htmlFor="log-comments">Commentaires</Label>
          <Input {...field("comments")} inputMode="numeric" placeholder="35" />
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-faint">
        Ces chiffres sont dans les statistiques de ta vidéo (TikTok : « Analyse » ; Instagram : « Voir les statistiques »).
        La rétention, c&apos;est le « taux de visionnage » ou la durée moyenne regardée ÷ durée de la vidéo.
      </p>

      {error && (
        <div role="alert" className="text-[13px] text-danger">
          {error.message}
          {error.limit && (
            <Button size="sm" onClick={() => openUpgrade("journal")} className="mt-3 flex w-full">
              <Zap className="size-3.5" aria-hidden />
              Passer en Pro
            </Button>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        Ajouter au journal
      </Button>
    </form>
  );
}

function InsightCard({ insight, index }: { insight: JournalInsight; index: number }) {
  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4" data-testid="journal-insight">
      <p className="flex items-start gap-2.5 text-[14px] font-semibold leading-snug">
        <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[11px] text-accent">{index + 1}</span>
        {insight.title}
      </p>
      <p className="mt-1.5 pl-[30px] text-[13px] leading-relaxed text-muted">{insight.detail}</p>
    </li>
  );
}

function Insights({ logs, isPro }: { logs: VideoLog[]; isPro: boolean }) {
  const { openUpgrade } = useCredits();
  const { insights, formula } = useMemo(() => computeInsights(logs), [logs]);
  const missing = INSIGHTS_MIN_LOGS - logs.length;

  if (missing > 0) {
    return (
      <Card className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <Lightbulb className="size-4 text-accent" aria-hidden />
          Tes tendances arrivent
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Ajoute encore {missing} vidéo{missing > 1 ? "s" : ""} : dès {INSIGHTS_MIN_LOGS}, ViralForge compare tes vidéos entre
          elles (durée, hook, plateforme, jour) et te dit ce qui marche pour toi.
        </p>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {Array.from({ length: INSIGHTS_MIN_LOGS }, (_, index) => (
            <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < logs.length ? "bg-accent" : "bg-white/[0.08]")} />
          ))}
        </div>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <Lightbulb className="size-4 text-accent" aria-hidden />
          Pas encore de tendance nette
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Tes vidéos font des scores proches, ou se ressemblent trop pour être comparées. Varie un seul paramètre à la fois
          (durée, style de hook, plateforme) et note les résultats : les écarts apparaîtront.
        </p>
      </Card>
    );
  }

  const visible = isPro ? insights : insights.slice(0, 1);
  const locked = isPro ? [] : insights.slice(1);

  return (
    <Card>
      <CardHeader eyebrow={`Calculé sur tes ${logs.length} vidéos`} title="Ce qui marche pour toi" />
      <div className="space-y-4 p-4 sm:p-5">
        <ul className="space-y-2.5">
          {visible.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} />
          ))}
        </ul>

        {isPro && formula.length > 0 && (
          <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4" data-testid="journal-formula">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Crown className="size-4 text-accent" aria-hidden />
              Ta formule pour la prochaine vidéo
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {formula.map((entry) => (
                <div key={entry.label} className="rounded-lg bg-black/20 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-widest text-faint">{entry.label}</dt>
                  <dd className="mt-0.5 text-[13px] font-medium">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {locked.length > 0 && (
          <div className="relative overflow-hidden rounded-xl">
            <ul className="pointer-events-none select-none space-y-2.5 blur-[6px]" aria-hidden>
              {locked.slice(0, 3).map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index + 1} />
              ))}
            </ul>
            <div className="absolute inset-0 grid place-items-center bg-bg/40 p-4">
              <div className="max-w-sm rounded-2xl border border-white/[0.1] bg-elevated/95 p-5 text-center shadow-2xl">
                <p className="text-[15px] font-semibold" data-testid="journal-locked">
                  {locked.length} autre{locked.length > 1 ? "s" : ""} tendance{locked.length > 1 ? "s" : ""} trouvée
                  {locked.length > 1 ? "s" : ""} dans tes vidéos
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {formula.length > 0 ? "Plus ta formule pour la prochaine vidéo, " : ""}calculée sur tes vrais chiffres.
                </p>
                <Button onClick={() => openUpgrade("insights")} className="mt-4 w-full">
                  <Lock className="size-4" aria-hidden />
                  Tout débloquer avec Pro
                </Button>
                {PRO_PRICE_PER_DAY && <p className="mt-2 text-[11px] text-faint">Soit {PRO_PRICE_PER_DAY} par jour · sans engagement</p>}
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-faint">
          Chaque tendance compare la médiane des vues de deux groupes de tes vidéos. Sur peu de vidéos, c&apos;est une piste à
          tester, pas une certitude.
        </p>
      </div>
    </Card>
  );
}

export function JournalView({ initialLogs, unavailable }: { initialLogs: VideoLog[]; unavailable: boolean }) {
  const { plan } = useCredits();
  const isPro = plan === "pro";
  const [logs, setLogs] = useState(initialLogs);
  const [deleting, setDeleting] = useState<string | null>(null);
  const summary = useMemo(() => summarize(logs), [logs]);
  const full = !isPro && logs.length >= JOURNAL_FREE_LIMIT;

  async function remove(id: string) {
    setDeleting(id);
    const result = await deleteVideoLog(id);
    if (result.ok) setLogs((current) => current.filter((log) => log.id !== id));
    setDeleting(null);
  }

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <NotebookPen className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Journal de performance</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Note les vrais chiffres de tes vidéos publiées : ViralForge trouve ce qui marche pour toi. Aucun chatbot ne
              connaît tes stats.
            </p>
          </div>
        </div>
        <span className="hairline inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1 text-xs text-muted" data-testid="journal-quota">
          {isPro ? (
            <>
              <InfinityIcon className="size-3.5 text-accent" aria-hidden />
              Journal illimité
            </>
          ) : (
            `${Math.min(logs.length, JOURNAL_FREE_LIMIT)} / ${JOURNAL_FREE_LIMIT} vidéos · gratuit`
          )}
        </span>
      </header>

      {unavailable ? (
        <Card className="p-6 text-sm text-muted">Le journal est momentanément indisponible. Réessaie dans un instant.</Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="hairline rounded-2xl bg-surface p-5 sm:p-6 xl:sticky xl:top-8">
            <AddVideoForm full={full} onAdded={(log) => setLogs((current) => [log, ...current])} />
          </div>

          <div className="min-w-0 space-y-5">
            {logs.length > 0 && (
              <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06]">
                {[
                  { label: "Vidéos", value: NUMBER.format(summary.count) },
                  { label: "Vues au total", value: COMPACT.format(summary.totalViews) },
                  { label: "Vues médianes", value: COMPACT.format(summary.medianViews) },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface px-4 py-3.5">
                    <dt className="text-[11px] uppercase tracking-widest text-faint">{stat.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <Insights logs={logs} isPro={isPro} />

            {logs.length > 0 && (
              <Card>
                <CardHeader eyebrow="Tes vidéos" title={`${logs.length} vidéo${logs.length > 1 ? "s" : ""} notée${logs.length > 1 ? "s" : ""}`} />
                <ul className="divide-y divide-white/[0.06]">
                  {logs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 px-5 py-4 sm:px-6" data-testid="journal-row">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-[14px] font-medium">
                          <span className="truncate">{log.title}</span>
                          {summary.best?.id === log.id && logs.length > 1 && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                              <Trophy className="size-3" aria-hidden />
                              Record
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-faint">
                          {VIDEO_PLATFORM_LABELS[log.platform]} · {formatDate(log.publishedOn)}
                          {log.durationSeconds !== null && ` · ${log.durationSeconds} s`}
                          {log.avgWatchPct !== null && ` · ${NUMBER.format(log.avgWatchPct)} % regardés`}
                        </p>
                        {log.hook && <p className="mt-1 line-clamp-1 text-[13px] text-muted">« {log.hook} »</p>}
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="block text-[15px] font-semibold tabular-nums">{COMPACT.format(log.views)}</span>
                        <span className="text-[11px] text-faint">vues</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => void remove(log.id)}
                        disabled={deleting === log.id}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-danger disabled:opacity-50"
                        aria-label={`Supprimer « ${log.title} »`}
                      >
                        {deleting === log.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
