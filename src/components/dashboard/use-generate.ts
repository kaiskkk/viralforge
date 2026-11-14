"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useCredits } from "@/components/dashboard/credits-context";
import type { ToolId, ToolInputs, ToolOutputs } from "@/lib/tools";

export type GenerateState<Result> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: Result }
  | { status: "error"; code: string; message: string };

type ApiResponse<Result> = {
  result?: Result;
  credits?: number | null;
  error?: { code: string; message: string };
};

/**
 * Lance un outil et suit l'état de la requête. Par défaut POST /api/generate
 * avec { tool, input } ; une route dédiée (ex. /api/clone-video) reçoit
 * directement l'entrée.
 */
export function useGenerate<Tool extends ToolId>(tool: Tool, options: { endpoint?: string } = {}) {
  const endpoint = options.endpoint ?? "/api/generate";
  const [state, setState] = useState<GenerateState<ToolOutputs[Tool]>>({ status: "idle" });
  const { setCredits } = useCredits();
  const router = useRouter();
  const pathname = usePathname();

  const generate = useCallback(
    async (input: ToolInputs[Tool]) => {
      setState({ status: "loading" });

      let response: Response;
      let payload: ApiResponse<ToolOutputs[Tool]> | null;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(endpoint === "/api/generate" ? { tool, input } : input),
        });
        payload = await response.json().catch(() => null);
      } catch {
        setState({
          status: "error",
          code: "network",
          message: "Connexion interrompue. Vérifie ta connexion et réessaie.",
        });
        return;
      }

      // Session expirée : retour à la connexion, puis à cette page.
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (typeof payload?.credits === "number") setCredits(payload.credits);

      if (!response.ok || !payload?.result) {
        setState({
          status: "error",
          code: payload?.error?.code ?? "unknown",
          message: payload?.error?.message ?? "Une erreur est survenue. Réessaie.",
        });
        return;
      }

      setState({ status: "success", result: payload.result });
    },
    [tool, endpoint, setCredits, router, pathname],
  );

  return { state, generate };
}
