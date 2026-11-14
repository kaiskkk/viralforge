import { ArrowRight, Camera, Clapperboard, Download, Gauge } from "lucide-react";

import { ToolIcon } from "@/components/tool-icon";
import { TOOLS, type ToolId } from "@/lib/tools";
import { cn } from "@/lib/utils";

/** Aperçu du Cloneur : chaque battement du script source retrouve son équivalent. */
function ClonePreview() {
  const beats = [
    { label: "Hook", width: "w-[70%]", color: "bg-accent" },
    { label: "Tension", width: "w-[90%]", color: "bg-warn" },
    { label: "Preuve", width: "w-[60%]", color: "bg-sky-400" },
    { label: "Payoff", width: "w-[80%]", color: "bg-fuchsia-400" },
  ];

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {(["Script source", "Ton sujet"] as const).map((title, column) => (
        <div key={title} className={cn("space-y-2.5", column === 1 && "col-start-3")}>
          <p className="text-[10px] uppercase tracking-widest text-faint">{title}</p>
          {beats.map((beat) => (
            <div key={beat.label} className="flex items-center gap-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", beat.color)} />
              <span
                className={cn(
                  "h-2 rounded-full",
                  beat.width,
                  column === 0 ? "bg-white/[0.12]" : cn(beat.color, "opacity-60"),
                )}
              />
            </div>
          ))}
        </div>
      ))}
      <ArrowRight className="col-start-2 row-start-1 mt-5 size-4 text-faint" aria-hidden />
    </div>
  );
}

/** Aperçu d'Anti-Dropoff : passages lents surlignés, réécriture proposée. */
function AntiDropoffPreview() {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-muted">
        <span className="rounded bg-danger/15 px-1 text-danger decoration-danger/60 [text-decoration:underline_wavy]">
          Bonjour à tous, aujourd&apos;hui on va parler
        </span>{" "}
        de la seule habitude qui a doublé mes vues.{" "}
        <span className="rounded bg-warn/15 px-1 text-warn">Alors du coup, en fait,</span> elle
        prend 30 secondes.
      </p>
      <div className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-accent">Réécriture</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg">
          Une habitude a doublé mes vues. Elle prend 30 secondes.
        </p>
      </div>
    </div>
  );
}

/** Aperçu de la Série : sept jours reliés par des cliffhangers. */
function SeriesPreview() {
  return (
    <div>
      <div className="flex items-center">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex flex-1 items-center last:flex-none">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px]",
                index === 0
                  ? "bg-accent font-semibold text-black"
                  : "border border-white/[0.12] text-muted",
              )}
            >
              J{index + 1}
            </span>
            {index < 6 && <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-white/5" />}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-faint">Cliffhanger · J1 → J2</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg">
          « Demain, je te montre l&apos;erreur qui a failli tout faire échouer. »
        </p>
      </div>
    </div>
  );
}

/** Aperçu du Labo à hooks : des accroches classées par force. */
function HooksPreview() {
  const hooks = [
    { text: "Tu perds 2 heures par jour sans le savoir.", score: 92 },
    { text: "Arrête de faire des to-do lists.", score: 81 },
    { text: "Le secret des gens qui finissent tout ?", score: 74 },
  ];
  return (
    <ol className="space-y-2.5">
      {hooks.map((hook, index) => (
        <li key={hook.text} className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px]",
              index === 0 ? "bg-accent font-semibold text-black" : "border border-white/[0.12] text-muted",
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{hook.text}</span>
          <span className="font-mono text-[11px] tabular-nums text-accent">{hook.score}</span>
        </li>
      ))}
    </ol>
  );
}

const PREVIEWS: Record<ToolId, () => JSX.Element> = {
  clone: ClonePreview,
  antidropoff: AntiDropoffPreview,
  series: SeriesPreview,
  hooks: HooksPreview,
};

const DETAILS: Record<ToolId, string> = {
  clone:
    "Colle un script qui a explosé. ViralForge en isole la structure psychologique — hook, tension, preuve, payoff — et la rejoue sur ton sujet, sans reprendre un seul mot.",
  antidropoff:
    "Ton script est lu comme par un spectateur, le pouce sur l'écran. Chaque passage qui fait swiper est surligné, expliqué, et réécrit en version punchy.",
  series:
    "Donne un sujet : tu reçois sept scripts qui s'enchaînent. Chaque épisode se suffit, et chaque chute donne une raison de revenir le lendemain.",
  hooks:
    "Les deux premières secondes décident de tout. Donne ton sujet : dix accroches aux angles différents, notées et classées, prêtes à être dites face caméra.",
};

export function ToolsShowcase() {
  return (
    <section id="outils" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-[13px] font-medium text-accent">Les outils</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tightest sm:text-[40px] sm:leading-[1.1]">
          <span className="text-gradient">Quatre outils, un studio, une obsession : la rétention.</span>
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Chaque outil s&apos;attaque à un moment précis où une vidéo perd son audience : les
          deux premières secondes, la structure, le milieu qui s&apos;essouffle, le lendemain.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {(Object.keys(TOOLS) as ToolId[]).map((id) => {
            const tool = TOOLS[id];
            const Preview = PREVIEWS[id];
            return (
              <article
                key={id}
                className="hairline group flex flex-col rounded-2xl bg-surface p-6 transition-colors hover:border-white/[0.14]"
              >
                <div className="hairline flex min-h-[168px] flex-col justify-center rounded-xl bg-bg/60 p-4">
                  <Preview />
                </div>
                <div className="mt-6 flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
                    <ToolIcon tool={id} className="size-4" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">{tool.name}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{DETAILS[id]}</p>
              </article>
            );
          })}
        </div>

        <StudioFeature />
      </div>
    </section>
  );
}

/** Le Studio : du script à la vidéo, sans quitter le téléphone. */
function StudioFeature() {
  const points = [
    { icon: Gauge, text: "Le texte défile à ton rythme, réglable pendant la prise." },
    { icon: Camera, text: "Ta caméra en fond : tu lis en regardant l'objectif." },
    { icon: Download, text: "La vidéo s'enregistre sur ton téléphone, prête à publier." },
  ];
  return (
    <article className="relative mt-4 overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] via-surface to-surface p-6 sm:p-8">
      <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-black">
              <Clapperboard className="size-4" aria-hidden />
            </span>
            <h3 className="text-base font-semibold tracking-tight">Studio de tournage</h3>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Ton script est prêt ? Appuie sur « Tourner » : il défile en téléprompteur par-dessus
            ta caméra, et tu repars avec ta vidéo.
          </p>
          <ul className="mt-5 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[13px] leading-relaxed text-fg">
                <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
        {/* Maquette du prompteur */}
        <div className="mx-auto w-full max-w-[240px]" aria-hidden>
          <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-800 to-zinc-950 p-4 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/80 to-transparent" />
            <div className="relative space-y-2 pt-10 text-[13px] font-semibold leading-snug text-white">
              <p className="text-white/40">Tu perds 2 heures par jour.</p>
              <p className="border-l-2 border-accent pl-2">Et non, ce n&apos;est pas ton téléphone.</p>
              <p className="text-white/80">Chaque matin, j&apos;écris 3 tâches.</p>
              <p className="text-white/50">Pas une de plus.</p>
            </div>
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <span className="grid size-12 place-items-center rounded-full border-[3px] border-white">
                <span className="size-8 rounded-full bg-danger" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
