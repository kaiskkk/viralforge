"use client";

import { Camera, CameraOff, Clapperboard, FlipHorizontal2, Play, Type } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Prompter, WPM_MAX, WPM_MIN, type PrompterSettings } from "@/components/dashboard/studio/prompter";
import { Button } from "@/components/ui/button";
import { FieldTitle, Label, Textarea } from "@/components/ui/field";
import { readStudioScript } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/viral-score";

const SETTINGS_KEY = "viralforge:studio-settings";
const DEFAULT_SETTINGS: PrompterSettings = { wpm: 150, fontSize: "m", mirror: false, camera: true };

function loadSettings(): PrompterSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<PrompterSettings> | null;
    return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Toggle({
  checked,
  onChange,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
        checked ? "border-accent/40 bg-accent/[0.07]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]",
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", checked ? "bg-accent/15 text-accent" : "bg-white/[0.05] text-muted")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-white/15")} aria-hidden>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Studio : réglages du téléprompteur, puis lecture plein écran par-dessus la caméra. */
export function Studio() {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);

  // Script envoyé par un bouton « Tourner », et réglages de la dernière fois.
  useEffect(() => {
    const incoming = readStudioScript();
    if (incoming) {
      setTitle(incoming.title);
      setScript(incoming.script);
    }
    setSettings(loadSettings());
  }, []);

  function updateSettings(next: PrompterSettings) {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Réglages non mémorisés : sans conséquence.
    }
  }

  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  const seconds = Math.round((words / settings.wpm) * 60);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Clapperboard className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Ton script défile en téléprompteur par-dessus ta caméra : tu le lis en regardant
            l&apos;objectif, tu te filmes, tu récupères la vidéo. Tout reste sur ton appareil.
          </p>
        </div>
      </header>

      <div className="hairline space-y-6 rounded-2xl bg-surface p-5 sm:p-7">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="studio-script">{title ? `Script : ${title}` : "Ton script"}</Label>
            <span className="font-mono text-xs tabular-nums text-faint">
              {words} mots · ≈ {formatDuration(seconds)}
            </span>
          </div>
          <Textarea
            id="studio-script"
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={8}
            placeholder="Colle ton script ici, ou ouvre un résultat et appuie sur « Tourner »."
          />
          <p className="mt-2 text-xs text-muted">
            Astuce : les boutons « Tourner » des outils et des{" "}
            <Link href="/dashboard/saved" className="text-fg underline-offset-4 hover:underline">
              scripts sauvegardés
            </Link>{" "}
            remplissent ce champ pour toi.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="studio-speed">Vitesse de défilement</Label>
            <span className="font-mono text-xs tabular-nums text-muted">{settings.wpm} mots/min</span>
          </div>
          <input
            id="studio-speed"
            type="range"
            min={WPM_MIN}
            max={WPM_MAX}
            step={10}
            value={settings.wpm}
            onChange={(event) => updateSettings({ ...settings, wpm: Number(event.target.value) })}
            className="w-full accent-[rgb(var(--accent))]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-faint">
            <span>Posé</span>
            <span>Naturel (150)</span>
            <span>Rapide</span>
          </div>
        </div>

        <div>
          <FieldTitle>Taille du texte</FieldTitle>
          <div className="flex gap-2" role="radiogroup" aria-label="Taille du texte">
            {(["s", "m", "l"] as const).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={settings.fontSize === size}
                onClick={() => updateSettings({ ...settings, fontSize: size })}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm transition-colors",
                  settings.fontSize === size
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-fg",
                )}
              >
                <Type className={cn(size === "s" ? "size-3" : size === "m" ? "size-4" : "size-5")} aria-hidden />
                {size === "s" ? "Petit" : size === "m" ? "Moyen" : "Grand"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={settings.camera}
            onChange={(camera) => updateSettings({ ...settings, camera })}
            icon={settings.camera ? <Camera className="size-4" aria-hidden /> : <CameraOff className="size-4" aria-hidden />}
            label="Caméra"
            hint="Te voir et t'enregistrer"
          />
          <Toggle
            checked={settings.mirror}
            onChange={(mirror) => updateSettings({ ...settings, mirror })}
            icon={<FlipHorizontal2 className="size-4" aria-hidden />}
            label="Texte en miroir"
            hint="Pour un prompteur à vitre"
          />
        </div>

        <Button
          type="button"
          onClick={() => setOpen(true)}
          disabled={words === 0}
          className="h-12 w-full text-[15px]"
        >
          <Play className="size-4" aria-hidden />
          Lancer le prompteur
        </Button>
      </div>

      {open && (
        <Prompter
          script={script.trim()}
          title={title || "Ma vidéo"}
          settings={settings}
          onSettingsChange={updateSettings}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
