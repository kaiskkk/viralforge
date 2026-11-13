"use client";

import { useState } from "react";

import { CloneResult } from "@/components/dashboard/results/clone-result";
import { SaveButton } from "@/components/dashboard/save-button";
import { GenerateButton, ResultPanel, ToolColumns, ToolHeader } from "@/components/dashboard/tool-shell";
import { useGenerate } from "@/components/dashboard/use-generate";
import { CharCount, Input, Label, Textarea } from "@/components/ui/field";
import { cloneInputSchema, SCRIPT_MAX_CHARS, TOPIC_MAX_CHARS, type CloneInput } from "@/lib/tools";

export function CloneTool() {
  const { state, generate } = useGenerate("clone");
  const [sourceScript, setSourceScript] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // L'entrée qui a produit le résultat affiché (pour la sauvegarde).
  const [submitted, setSubmitted] = useState<CloneInput | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = cloneInputSchema.safeParse({ sourceScript, newTopic });
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
      <ToolHeader tool="clone" />
      <ToolColumns
        form={
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <Label htmlFor="source-script">Script viral à cloner</Label>
                <CharCount value={sourceScript} max={SCRIPT_MAX_CHARS} />
              </div>
              <Textarea
                id="source-script"
                value={sourceScript}
                onChange={(event) => setSourceScript(event.target.value)}
                rows={11}
                placeholder="Colle la transcription d'une vidéo qui a très bien marché dans ta niche…"
                required
              />
            </div>

            <div>
              <Label htmlFor="new-topic">Ton nouveau sujet</Label>
              <Input
                id="new-topic"
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
                maxLength={TOPIC_MAX_CHARS}
                placeholder="Ex. : pourquoi se mettre au piano à 30 ans"
                required
              />
            </div>

            {fieldError && (
              <p role="alert" className="text-[13px] text-danger">
                {fieldError}
              </p>
            )}

            <GenerateButton loading={state.status === "loading"}>Cloner la structure</GenerateButton>
          </form>
        }
        result={
          <ResultPanel
            tool="clone"
            state={state}
            emptyHint="Le nouveau script et la structure détectée, battement par battement, apparaîtront ici."
            loadingSteps={[
              "Lecture du script source…",
              "Extraction de la structure psychologique…",
              "Écriture du nouveau script…",
            ]}
          >
            {(output) => (
              <CloneResult
                output={output}
                actions={
                  submitted && (
                    <SaveButton
                      payload={{ tool: "clone", title: output.title, input: submitted, output }}
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
