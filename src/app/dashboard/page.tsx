import { ArrowUpRight, Bookmark, ChartSpline, Clapperboard, NotebookPen, UserRound } from "lucide-react";
import Link from "next/link";

import { CheckoutLink } from "@/components/checkout-link";
import { BlueprintModule } from "@/components/dashboard/blueprint-module";
import { InstallCard } from "@/components/dashboard/install-card";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { SavedScriptRow } from "@/components/dashboard/saved-script-row";
import { ToolIcon } from "@/components/tool-icon";
import { Card } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { FREE_CREDITS, isPro } from "@/lib/plans";
import { isProfileEmpty, profileSummary } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, WRITING_TOOL_IDS } from "@/lib/tools";

export default async function DashboardPage() {
  const viewer = await requireViewer();

  const supabase = createClient();
  const [{ data: recent }, journal] = await Promise.all([
    supabase.from("saved_scripts").select("id, tool, title, created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("video_logs").select("id", { count: "exact", head: true }).eq("user_id", viewer.id),
  ]);
  const generatedDone = isPro(viewer.plan) || viewer.credits < FREE_CREDITS || (recent?.length ?? 0) > 0;

  const status = isPro(viewer.plan)
    ? "Plan Pro : tes générations sont illimitées."
    : viewer.credits > 0
      ? `Il te reste ${viewer.credits} crédit${viewer.credits > 1 ? "s" : ""} sur tes ${FREE_CREDITS} offerts.`
      : `Tu as utilisé tes ${FREE_CREDITS} crédits offerts.`;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Qu&apos;est-ce qu&apos;on forge aujourd&apos;hui ?</h1>
        <p className="mt-1.5 text-sm text-muted">
          {status}{" "}
          {!isPro(viewer.plan) && (
            <CheckoutLink className="text-accent underline-offset-4 hover:underline">
              Passer en Pro
            </CheckoutLink>
          )}
        </p>
      </header>

      <BlueprintModule />

      <OnboardingChecklist
        profileDone={!isProfileEmpty(viewer.profile)}
        generatedDone={generatedDone}
        journalDone={(journal.count ?? 0) > 0}
      />

      <InstallCard />

      <section aria-label="Outils" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {WRITING_TOOL_IDS.map((id) => {
          const tool = TOOLS[id];
          return (
            <Link
              key={id}
              href={tool.href}
              className="hairline group flex flex-col rounded-2xl bg-surface p-4 transition-colors hover:border-white/[0.16] hover:bg-elevated sm:p-5"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <ToolIcon tool={id} className="size-5" />
                </span>
                <ArrowUpRight
                  className="size-4 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
                  aria-hidden
                />
              </div>
              <h2 className="mt-4 text-sm font-semibold leading-snug tracking-tight sm:mt-5 sm:text-[15px]">
                {tool.name}
              </h2>
              {/* Sur téléphone, la grille 2 × 2 reste compacte : le titre suffit. */}
              <p className="mt-1.5 hidden text-[13px] leading-relaxed text-muted sm:block">{tool.tagline}</p>
            </Link>
          );
        })}
      </section>

      <section aria-label="Analyser" className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {[
          {
            href: "/dashboard/retention",
            icon: ChartSpline,
            badge: "Gratuit · illimité",
            title: "Courbe de rétention",
            text: "Tape ton script : chaque phrase est mesurée en direct, et la courbe montre à quelle seconde les gens décrochent.",
          },
          {
            href: "/dashboard/journal",
            icon: NotebookPen,
            badge: "Nouveau",
            title: "Journal de performance",
            text: "Note les vrais chiffres de tes vidéos : ViralForge trouve ta durée, ton style de hook et ton jour qui marchent le mieux.",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="hairline group flex gap-4 rounded-2xl bg-surface p-5 transition-colors hover:border-white/[0.16] hover:bg-elevated"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-fg">
              <card.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight">{card.title}</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{card.badge}</span>
              </span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">{card.text}</span>
            </span>
          </Link>
        ))}
      </section>

      <section aria-label="Studio et profil" className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Link
          href="/dashboard/studio"
          className="group relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.14] via-accent/[0.04] to-transparent p-6 transition-colors hover:border-accent/50"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-black">
            <Clapperboard className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">Studio : tourne ta vidéo ici</h2>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            Ton script défile en téléprompteur par-dessus ta caméra. Tu te filmes, tu récupères la
            vidéo, prête à publier.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
            Ouvrir le studio
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
        <Link
          href="/dashboard/profile"
          className="hairline group flex flex-col rounded-2xl bg-surface p-6 transition-colors hover:border-white/[0.16] hover:bg-elevated"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <UserRound className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-[15px] font-semibold tracking-tight">Profil créateur</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {isProfileEmpty(viewer.profile) || !viewer.profile
              ? "Dis-nous ta niche, ton audience et ton ton : les outils écriront dans ta voix."
              : `Appliqué à tous les outils : ${profileSummary(viewer.profile)}.`}
          </p>
          <span className="mt-auto pt-4 text-[13px] font-medium text-fg">
            {isProfileEmpty(viewer.profile) ? "Remplir mon profil" : "Modifier"}
          </span>
        </Link>
      </section>

      <section aria-labelledby="recent-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-title" className="text-sm font-medium">
            Derniers scripts sauvegardés
          </h2>
          {recent && recent.length > 0 && (
            <Link href="/dashboard/saved" className="text-[13px] text-muted transition-colors hover:text-fg">
              Tout voir
            </Link>
          )}
        </div>

        {recent && recent.length > 0 ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-white/[0.06]">
              {recent.map((script) => (
                <SavedScriptRow key={script.id} script={script} />
              ))}
            </ul>
          </Card>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.1] px-6 py-10 text-center">
            <Bookmark className="mx-auto size-5 text-faint" aria-hidden />
            <p className="mt-3 text-sm text-muted">
              Rien pour l&apos;instant. Lance un outil, puis clique sur « Sauvegarder » pour retrouver
              ton script ici.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
