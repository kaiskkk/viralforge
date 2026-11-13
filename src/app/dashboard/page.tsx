import { ArrowUpRight, Bookmark } from "lucide-react";
import Link from "next/link";

import { CheckoutLink } from "@/components/checkout-link";
import { SavedScriptRow } from "@/components/dashboard/saved-script-row";
import { ToolIcon } from "@/components/tool-icon";
import { Card } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { FREE_CREDITS, isPro } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { TOOL_IDS, TOOLS } from "@/lib/tools";

export default async function DashboardPage() {
  const viewer = await requireViewer();

  const { data: recent } = await createClient()
    .from("saved_scripts")
    .select("id, tool, title, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

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

      <section aria-label="Outils" className="grid gap-4 md:grid-cols-3">
        {TOOL_IDS.map((id) => {
          const tool = TOOLS[id];
          return (
            <Link
              key={id}
              href={tool.href}
              className="hairline group flex flex-col rounded-2xl bg-surface p-5 transition-colors hover:border-white/[0.16] hover:bg-elevated"
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
              <h2 className="mt-5 text-[15px] font-semibold tracking-tight">{tool.name}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{tool.tagline}</p>
            </Link>
          );
        })}
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
