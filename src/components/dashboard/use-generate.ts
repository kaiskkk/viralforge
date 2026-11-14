"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCredits } from "@/components/dashboard/credits-context";
import { FreeEngineError, generateInBrowser, type FreeEngineErrorCode } from "@/lib/ai/free-engine";
import type { GenerateRequest, ToolId, ToolInputs, ToolOutputs } from "@/lib/tools";
import type { Plan } from "@/types/database";

export type GenerateState<Result> =
  | { status: "idle" }
  /** `notice` : message affiché pendant une attente imposée par le générateur. */
  | { status: "loading"; notice?: string }
  | { status: "success"; result: Result }
  | { status: "error"; code: string; message: string };

type ApiResponse<Result> = {
  result?: Result;
  engine?: "browser";
  plan?: Plan;
  credits?: number | null;
  error?: { code: string; message: string };
};

const NETWORK_ERROR = "Connexion interrompue. Vérifie ta connexion et réessaie.";

const FREE_ENGINE_MESSAGES: Record<FreeEngineErrorCode, string> = {
  busy: "Le générateur gratuit est saturé pour le moment. Réessaie dans une minute.",
  network: NETWORK_ERROR,
  refused: "Le générateur a refusé cette demande. Reformule ton texte et réessaie.",
  truncated: "Le texte demandé était trop long pour le générateur. Raccourcis-le et réessaie.",
  invalid_output: "Le générateur a renvoyé une réponse incomplète. Relance la génération.",
};

async function postJson<Result>(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<Result> | null;
  return { response, payload };
}

/** Lance un outil (via le serveur ou le générateur gratuit) et suit l'état de la requête. */
export function useGenerate<Tool extends ToolId>(tool: Tool) {
  const [state, setState] = useState<GenerateState<ToolOutputs[Tool]>>({ status: "idle" });
  const { setCredits } = useCredits();
  const router = useRouter();
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);

  // Quitter la page interrompt une génération en cours.
  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(
    async (input: ToolInputs[Tool]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: "loading" });

      const fail = (code: string, message: string) => setState({ status: "error", code, message });

      // 1. Le serveur vérifie la session et les crédits (et génère s'il a une clé Claude).
      let first: Awaited<ReturnType<typeof postJson<ToolOutputs[Tool]>>>;
      try {
        first = await postJson<ToolOutputs[Tool]>("/api/generate", { tool, input });
      } catch {
        return fail("network", NETWORK_ERROR);
      }
      const { response, payload } = first;

      // Session expirée : retour à la connexion, puis à cette page.
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (typeof payload?.credits === "number") setCredits(payload.credits);

      if (!response.ok || !payload) {
        return fail(
          payload?.error?.code ?? "unknown",
          payload?.error?.message ?? "Une erreur est survenue. Réessaie.",
        );
      }
      if (payload.result) {
        return setState({ status: "success", result: payload.result });
      }
      if (payload.engine !== "browser") {
        return fail("unknown", "Une erreur est survenue. Réessaie.");
      }

      // 2. Générateur gratuit, appelé depuis ce navigateur.
      let result: ToolOutputs[Tool];
      try {
        result = await generateInBrowser({ tool, input } as Extract<GenerateRequest, { tool: Tool }>, {
          signal: controller.signal,
          onWait: (seconds) =>
            setState({
              status: "loading",
              notice:
                seconds > 0
                  ? `Le générateur gratuit est très demandé : nouvel essai dans ${seconds} s.`
                  : undefined,
            }),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = error instanceof FreeEngineError ? error.code : "network";
        const note = payload.plan === "free" ? " Aucun crédit n'a été débité." : "";
        return fail(code, `${FREE_ENGINE_MESSAGES[code]}${note}`);
      }

      // 3. Génération réussie : le serveur débite le crédit (plan free).
      if (payload.plan === "free") {
        try {
          const commit = await postJson<never>("/api/generate/commit");
          if (typeof commit.payload?.credits === "number") setCredits(commit.payload.credits);
          if (!commit.response.ok) {
            return fail(
              commit.payload?.error?.code ?? "unknown",
              commit.payload?.error?.message ?? "Une erreur est survenue. Réessaie.",
            );
          }
        } catch {
          return fail("network", NETWORK_ERROR);
        }
      }

      if (!controller.signal.aborted) setState({ status: "success", result });
    },
    [tool, setCredits, router, pathname],
  );

  return { state, generate };
}
