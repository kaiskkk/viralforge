"use client";

import { Check, LoaderCircle, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { renderScoreCard } from "@/lib/score-card";
import type { ViralScore } from "@/lib/viral-score";

/**
 * Partage le score sous forme d'image : feuille de partage du téléphone
 * (Instagram, TikTok, messages…) quand elle accepte les fichiers, sinon
 * téléchargement de l'image.
 */
export function ShareScoreButton({ result }: { result: ViralScore }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  async function share() {
    setState("working");
    try {
      const blob = await renderScoreCard(result, window.location.host);
      const file = new File([blob], `score-viral-${result.total}.png`, { type: "image/png" });
      const text = `Mon script obtient ${result.total}/100 au score viral de ViralForge. Et le tien ?`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url: window.location.origin }).catch(() => undefined);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={share} disabled={state === "working"} className="w-full">
      {state === "working" ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : state === "done" ? (
        <Check className="size-3.5 text-accent" aria-hidden />
      ) : (
        <Share2 className="size-3.5" aria-hidden />
      )}
      Partager mon score
    </Button>
  );
}
