"use client";

import { useState } from "react";

import { SeriesResult } from "@/components/dashboard/results/series-result";
import { SaveButton } from "@/components/dashboard/save-button";
import { GenerateButton, ResultPanel, ToolColumns, ToolHeader } from "@/components/dashboard/tool-shell";
import { useGenerate } from "@/components/dashboard/use-generate";
import { Input, Label, Textarea } from "@/components/ui/field";
import { seriesInputSchema, TOPIC_MAX_CHARS, type SeriesInput } from "@/lib/tools";

export function SeriesTool() {
  const { state, generate } = useGenerate("series");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // L'entrée qui a produit le résultat affiché (pour la sauvegarde).
  const [submitted, setSubmitted] = useState<SeriesInput | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = seriesInputSchema.safeParse({
      topic,
      audience: audience.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Vérifie les champs.");
      return;
    }
    setFieldError(null);
    setSubmitted(parsed.data);
    void generate(parsed.data);
  }

  return (
    <>
      <ToolHeader tool="series" />
      <ToolColumns
        form={
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="topic">Sujet de la série</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={TOPIC_MAX_CHARS}
                rows={3}
                placeholder="Ex. : lancer une boutique en ligne en partant de zéro"
                required
              />
            </div>

            <div>
              <Label htmlFor="audience">
                Audience <span className="font-normal text-faint">(optionnel)</span>
              </Label>
              <Input
                id="audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                maxLength={200}
                placeholder="Ex. : salariés qui veulent un revenu complémentaire"
              />
            </div>

            {fieldError && (
              <p role="alert" className="text-[13px] text-danger">
                {fieldError}
              </p>
            )}

            <GenerateButton loading={state.status === "loading"}>Générer les 7 épisodes</GenerateButton>
          </form>
        }
        result={
          <ResultPanel
            tool="series"
            state={state}
            emptyHint="Tes 7 épisodes apparaîtront ici, reliés jour après jour par leurs cliffhangers."
            loadingSteps={[
              "Construction de l'arc de la série…",
              "Écriture des 7 épisodes…",
              "Raccord des cliffhangers…",
            ]}
          >
            {(output) => (
              <SeriesResult
                output={output}
                actions={
                  submitted && (
                    <SaveButton
                      payload={{ tool: "series", title: output.seriesTitle, input: submitted, output }}
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
