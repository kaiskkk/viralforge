"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "viralforge:install-dismissed";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/**
 * Invite à installer ViralForge sur l'écran d'accueil. Android et Chrome
 * proposent l'installation directe ; sur iPhone, on explique le geste
 * (Partager, puis « Sur l'écran d'accueil »). Masquée une fois installée.
 */
export function InstallCard() {
  const [mode, setMode] = useState<"hidden" | "ios" | "prompt">("hidden");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Stockage indisponible : la carte reste affichée.
    }
    if (standalone || dismissed) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (isIos) setMode("ios");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Sans stockage, la carte reviendra à la prochaine visite.
    }
  }

  if (mode === "hidden") return null;

  return (
    <section className="hairline relative flex items-start gap-4 rounded-2xl bg-surface p-5" aria-label="Installer l'application">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Download className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <h2 className="text-[15px] font-semibold">Installe ViralForge sur ton téléphone</h2>
        {mode === "ios" ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Dans Safari, appuie sur <Share className="inline size-3.5 -translate-y-px" aria-label="Partager" />{" "}
            puis sur <span className="text-fg">« Sur l&apos;écran d&apos;accueil »</span>{" "}
            <SquarePlus className="inline size-3.5 -translate-y-px" aria-hidden />. ViralForge
            s&apos;ouvrira en plein écran, comme une app.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Un raccourci sur ton écran d&apos;accueil, en plein écran, comme une app.
            </p>
            <button
              type="button"
              onClick={async () => {
                await promptEvent?.prompt();
                dismiss();
              }}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-black"
            >
              Installer
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-faint hover:bg-white/[0.06] hover:text-fg"
        aria-label="Masquer"
      >
        <X className="size-4" aria-hidden />
      </button>
    </section>
  );
}
