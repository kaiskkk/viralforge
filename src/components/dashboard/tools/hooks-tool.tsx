"use client";

import { useState } from "react";

import { HooksResult } from "@/components/dashboard/results/hooks-result";
import { SaveButton } from "@/components/dashboard/save-button";
import { GenerateButton, ResultPanel, ToolColumns, ToolHeader } from "@/components/dashboard/tool-shell";
import { useGenerate } from "@/components/dashboard/use-generate";
import { Input, Label, Textarea } from "@/components/ui/field";
import { hooksInputSchema, TOPIC_MAX_CHARS, type HooksInput } from "@/lib/tools";

export function HooksTool() {
  const { state, generate } = useGenerate("hooks");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // L'entrée qui a produit le résultat affiché (pour la sauvegarde).
  const [submitted, setSubmitted] = useState<HooksInput | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = hooksInputSchema.safeParse({ topic, audience: audience.trim() || undefined });
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
      <ToolHeader tool="hooks" />
      <ToolColumns
        form={
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="topic">Sujet de ta vidéo</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={TOPIC_MAX_CHARS}
                rows={3}
                placeholder="Ex. : comment j'ai économisé 3 000 € en un an sans me priver"
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
                placeholder="Ex. : étudiants qui galèrent à finir le mois"
              />
            </div>

            {fieldError && (
              <p role="alert" className="text-[13px] text-danger">
                {fieldError}
              </p>
            )}

            <GenerateButton loading={state.status === "loading"}>Générer 10 accroches</GenerateButton>
          </form>
        }
        result={
          <ResultPanel
            tool="hooks"
            state={state}
            emptyHint="Dix accroches aux angles différents apparaîtront ici, de la plus forte à la plus faible."
            loadingSteps={["Exploration des angles…", "Écriture des accroches…", "Classement par force…"]}
          >
            {(output) => (
              <HooksResult
                output={output}
                actions={
                  submitted && (
                    <SaveButton
                      payload={{ tool: "hooks", title: `Accroches : ${submitted.topic}`.slice(0, 200), input: submitted, output }}
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
