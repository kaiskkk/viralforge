"use client";

import { useEffect, useState } from "react";

import { AntiDropoffResult } from "@/components/dashboard/results/anti-dropoff-result";
import { SaveButton } from "@/components/dashboard/save-button";
import { GenerateButton, ResultPanel, ToolColumns, ToolHeader } from "@/components/dashboard/tool-shell";
import { useGenerate } from "@/components/dashboard/use-generate";
import { CharCount, Label, Textarea } from "@/components/ui/field";
import { takeDraft } from "@/lib/handoff";
import { antiDropoffInputSchema, SCRIPT_MAX_CHARS, type AntiDropoffInput } from "@/lib/tools";

/** Titre de sauvegarde : le début du script analysé. */
function titleFrom(script: string): string {
  const firstLine = script.trim().split("\n")[0] ?? "";
  return firstLine.length > 70 ? `${firstLine.slice(0, 70).trimEnd()}…` : firstLine;
}

export function AntiDropoffTool() {
  const { state, generate } = useGenerate("antidropoff");
  const [script, setScript] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // L'entrée qui a produit le résultat affiché (pour la sauvegarde).
  const [submitted, setSubmitted] = useState<AntiDropoffInput | null>(null);

  // Script envoyé depuis la Courbe de rétention.
  useEffect(() => {
    const draft = takeDraft("antidropoff");
    if (draft) setScript(draft);
  }, []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = antiDropoffInputSchema.safeParse({ script });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Vérifie le script.");
      return;
    }
    setFieldError(null);
    setSubmitted(parsed.data);
    void generate(parsed.data);
  }

  return (
    <>
      <ToolHeader tool="antidropoff" />
      <ToolColumns
        form={
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <Label htmlFor="script">Ton script</Label>
                <CharCount value={script} max={SCRIPT_MAX_CHARS} />
              </div>
              <Textarea
                id="script"
                value={script}
                onChange={(event) => setScript(event.target.value)}
                rows={14}
                placeholder="Colle le script que tu t'apprêtes à tourner…"
                required
              />
            </div>

            {fieldError && (
              <p role="alert" className="text-[13px] text-danger">
                {fieldError}
              </p>
            )}

            <GenerateButton loading={state.status === "loading"}>Analyser la rétention</GenerateButton>
          </form>
        }
        result={
          <ResultPanel
            tool="antidropoff"
            state={state}
            emptyHint="Ton script reviendra ici, avec les passages qui font swiper surlignés et réécrits."
            loadingSteps={[
              "Lecture du script, passage par passage…",
              "Repérage des points de décrochage…",
              "Réécriture des passages lents…",
            ]}
          >
            {(output) => (
              <AntiDropoffResult
                output={output}
                actions={
                  submitted && (
                    <SaveButton
                      payload={{
                        tool: "antidropoff",
                        title: titleFrom(submitted.script),
                        input: submitted,
                        output,
                      }}
                    />
                  )
                }
              />
            )}
          </ResultPanel>
        }
      />
    </>
  );
}
