import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteScriptButton } from "@/components/dashboard/delete-script-button";
import { AntiDropoffResult } from "@/components/dashboard/results/anti-dropoff-result";
import { BlueprintResult } from "@/components/dashboard/results/blueprint-result";
import { CloneResult } from "@/components/dashboard/results/clone-result";
import { HooksResult } from "@/components/dashboard/results/hooks-result";
import { SeriesResult } from "@/components/dashboard/results/series-result";
import { createClient } from "@/lib/supabase/server";
import {
  antiDropoffOutputSchema,
  blueprintOutputSchema,
  cloneOutputSchema,
  hooksOutputSchema,
  seriesOutputSchema,
  TOOLS,
  type ToolId,
} from "@/lib/tools";
import type { Json } from "@/types/database";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Script sauvegardé" };

/**
 * Rend le résultat avec le composant de son outil, après revalidation du JSON
 * stocké. Renvoie null si le contenu ne correspond plus au schéma.
 */
function renderSavedResult(tool: ToolId, output: Json): React.ReactNode {
  switch (tool) {
    case "clone": {
      const parsed = cloneOutputSchema.safeParse(output);
      return parsed.success ? <CloneResult output={parsed.data} /> : null;
    }
    case "antidropoff": {
      const parsed = antiDropoffOutputSchema.safeParse(output);
      return parsed.success ? <AntiDropoffResult output={parsed.data} /> : null;
    }
    case "series": {
      const parsed = seriesOutputSchema.safeParse(output);
      return parsed.success ? <SeriesResult output={parsed.data} /> : null;
    }
    case "hooks": {
      const parsed = hooksOutputSchema.safeParse(output);
      return parsed.success ? <HooksResult output={parsed.data} /> : null;
    }
    case "blueprint": {
      const parsed = blueprintOutputSchema.safeParse(output);
      return parsed.success ? <BlueprintResult output={parsed.data} /> : null;
    }
  }
}

export default async function SavedScriptPage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound();

  // Le RLS garantit qu'on ne lit que ses propres scripts.
  const { data: script } = await createClient()
    .from("saved_scripts")
    .select("id, tool, title, output, created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!script) notFound();

  const result = renderSavedResult(script.tool, script.output);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/saved"
        className="inline-flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Scripts sauvegardés
      </Link>

      <header className="mb-8 mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{script.title}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {TOOLS[script.tool].name} · sauvegardé le {formatDate(script.created_at)}
          </p>
        </div>
        <DeleteScriptButton id={script.id} redirectTo="/dashboard/saved" />
      </header>

      {result ?? (
        <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/[0.05] p-5 text-sm text-danger">
          Ce script a été enregistré dans un format qui n&apos;est plus lisible.
        </p>
      )}
    </div>
  );
}
