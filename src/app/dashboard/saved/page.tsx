import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DeleteScriptButton } from "@/components/dashboard/delete-script-button";
import { SavedScriptRow } from "@/components/dashboard/saved-script-row";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Scripts sauvegardés" };

export default async function SavedScriptsPage() {
  // Le RLS restreint la requête aux scripts de l'utilisateur connecté.
  const { data: scripts, error } = await createClient()
    .from("saved_scripts")
    .select("id, tool, title, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Scripts sauvegardés</h1>
        <p className="mt-1.5 text-sm text-muted">
          Tout ce que tu as choisi de garder, du plus récent au plus ancien.
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/[0.05] p-5 text-sm text-danger">
          Impossible de charger tes scripts. Recharge la page.
        </p>
      ) : scripts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] px-6 py-14 text-center">
          <Bookmark className="mx-auto size-5 text-faint" aria-hidden />
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Aucun script sauvegardé. Après une génération, clique sur « Sauvegarder » pour le
            retrouver ici.
          </p>
          <Link href="/dashboard/clone" className={buttonClasses({ size: "sm", className: "mt-5" })}>
            Lancer le Cloneur
          </Link>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-white/[0.06]">
            {scripts.map((script) => (
              <SavedScriptRow
                key={script.id}
                script={script}
                trailing={<DeleteScriptButton id={script.id} />}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
