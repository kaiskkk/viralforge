import { ArrowRight } from "lucide-react";

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

const PREVIEWS: Record<ToolId, () => JSX.Element> = {
  clone: ClonePreview,
  antidropoff: AntiDropoffPreview,
  series: SeriesPreview,
};

const DETAILS: Record<ToolId, string> = {
  clone:
    "Colle un script qui a explosé. ViralForge en isole la structure psychologique — hook, tension, preuve, payoff — et la rejoue sur ton sujet, sans reprendre un seul mot.",
  antidropoff:
    "Ton script est lu comme par un spectateur, le pouce sur l'écran. Chaque passage qui fait swiper est surligné, expliqué, et réécrit en version punchy.",
  series:
    "Donne un sujet : tu reçois sept scripts qui s'enchaînent. Chaque épisode se suffit, et chaque chute donne une raison de revenir le lendemain.",
};

export function ToolsShowcase() {
  return (
    <section id="outils" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-[13px] font-medium text-accent">Les outils</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tightest sm:text-[40px] sm:leading-[1.1]">
          <span className="text-gradient">Trois outils, une obsession : la rétention.</span>
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Chaque outil s&apos;attaque à un moment précis où une vidéo perd son audience : la
          structure, le milieu qui s&apos;essouffle, le lendemain.
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {(Object.keys(TOOLS) as ToolId[]).map((id) => {
            const tool = TOOLS[id];
            const Preview = PREVIEWS[id];
            return (
              <article
                key={id}
                className="hairline group flex flex-col rounded-2xl bg-surface p-6 transition-colors hover:border-white/[0.14]"
              >
                <div className="hairline flex h-[168px] flex-col justify-center rounded-xl bg-bg/60 p-4">
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
      </div>
    </section>
  );
}
