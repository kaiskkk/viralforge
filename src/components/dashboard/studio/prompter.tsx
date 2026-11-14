"use client";

import {
  Circle,
  Download,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Share2,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type PrompterSettings = {
  /** Débit de lecture, en mots par minute. */
  wpm: number;
  fontSize: "s" | "m" | "l";
  /** Texte inversé, pour un prompteur à vitre. */
  mirror: boolean;
  camera: boolean;
};

export const WPM_MIN = 80;
export const WPM_MAX = 260;
const COUNTDOWN_SECONDS = 3;

const FONT_CLASSES: Record<PrompterSettings["fontSize"], string> = {
  s: "text-2xl sm:text-3xl",
  m: "text-3xl sm:text-4xl",
  l: "text-4xl sm:text-5xl",
};

type Phase = "countdown" | "running" | "paused" | "done";

/** Premier format vidéo que le navigateur sait enregistrer (MP4 sur iPhone, WebM ailleurs). */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Téléprompteur plein écran : le texte défile au débit choisi, par-dessus la
 * caméra frontale. L'enregistrement capte la caméra et le micro (le texte
 * n'apparaît pas dans la vidéo) ; tout reste dans le navigateur.
 */
export function Prompter({
  script,
  title,
  settings,
  onSettingsChange,
  onClose,
}: {
  script: string;
  title: string;
  settings: PrompterSettings;
  onSettingsChange: (settings: PrompterSettings) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const offsetRef = useRef(0);
  const frameRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [cameraState, setCameraState] = useState<"off" | "starting" | "on" | "denied">(
    settings.camera ? "starting" : "off",
  );
  const [recording, setRecording] = useState<"idle" | "armed" | "recording">("idle");
  const [recordStartedAt, setRecordStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [clip, setClip] = useState<{ url: string; file: File } | null>(null);

  const words = useMemo(() => script.trim().split(/\s+/).filter(Boolean).length, [script]);
  const totalSeconds = Math.max(5, (words / settings.wpm) * 60);
  const canRecord = cameraState === "on" && typeof MediaRecorder !== "undefined";

  // --- Caméra et micro -------------------------------------------------------
  useEffect(() => {
    if (!settings.camera) return;
    let cancelled = false;
    const constraints: MediaStreamConstraints = {
      video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: true,
    };
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setCameraState("denied");
      return;
    }
    media
      .getUserMedia(constraints)
      // Sans micro (refusé ou absent) : la vidéo seule reste utile.
      .catch(() => media.getUserMedia({ video: constraints.video }))
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState("on");
      })
      .catch(() => !cancelled && setCameraState("denied"));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [settings.camera]);

  // --- Écran toujours allumé pendant la lecture -------------------------------
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock
      ?.request("screen")
      .then((sentinel) => (lock = sentinel))
      .catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  // --- Compte à rebours --------------------------------------------------------
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("running");
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // --- Enregistrement ----------------------------------------------------------
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const extension = type.includes("mp4") ? "mp4" : "webm";
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const file = new File([blob], `viralforge-${stamp}.${extension}`, { type });
      setClip({ url: URL.createObjectURL(blob), file });
      setRecording("idle");
      setRecordStartedAt(null);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording("recording");
    setRecordStartedAt(Date.now());
  }, []);

  useEffect(() => () => stopRecording(), [stopRecording]);
  useEffect(() => () => void (clip && URL.revokeObjectURL(clip.url)), [clip]);

  // Démarrage différé : l'enregistrement commence avec la lecture, après le décompte.
  useEffect(() => {
    if (phase === "running" && recording === "armed") startRecorder();
  }, [phase, recording, startRecorder]);

  useEffect(() => {
    if (recordStartedAt === null) return setElapsed(0);
    const timer = setInterval(() => setElapsed((Date.now() - recordStartedAt) / 1000), 250);
    return () => clearInterval(timer);
  }, [recordStartedAt]);

  // --- Défilement --------------------------------------------------------------
  const applyOffset = useCallback(() => {
    const text = textRef.current;
    if (!text) return;
    text.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
    setProgress(Math.min(1, offsetRef.current / Math.max(1, text.offsetHeight)));
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      lastTimeRef.current = undefined;
      return;
    }
    const step = (time: number) => {
      const text = textRef.current;
      if (text) {
        const last = lastTimeRef.current ?? time;
        const speed = text.offsetHeight / totalSeconds;
        offsetRef.current += (speed * (time - last)) / 1000;
        lastTimeRef.current = time;
        applyOffset();
        if (offsetRef.current >= text.offsetHeight) {
          setPhase("done");
          // Une seconde de marge pour la dernière phrase, puis fin de la prise.
          setTimeout(stopRecording, 1000);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [phase, totalSeconds, applyOffset, stopRecording]);

  // --- Commandes -----------------------------------------------------------------
  const restart = useCallback(() => {
    offsetRef.current = 0;
    applyOffset();
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
  }, [applyOffset]);

  const togglePlay = useCallback(() => {
    setPhase((current) => {
      if (current === "running") return "paused";
      if (current === "paused") return "running";
      return current;
    });
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording === "recording") return stopRecording();
    if (recording === "armed" || !canRecord) return;
    setClip(null);
    setRecording("armed");
    restart();
  }, [recording, canRecord, restart, stopRecording]);

  const changeSpeed = useCallback(
    (delta: number) => {
      const wpm = Math.min(WPM_MAX, Math.max(WPM_MIN, settings.wpm + delta));
      onSettingsChange({ ...settings, wpm });
    },
    [settings, onSettingsChange],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowUp") changeSpeed(10);
      else if (event.key === "ArrowDown") changeSpeed(-10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, togglePlay, changeSpeed]);

  // Pas de défilement de la page derrière le prompteur.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = previous);
  }, []);

  async function share() {
    if (!clip) return;
    try {
      await navigator.share({ files: [clip.file], title });
    } catch {
      // Partage annulé ou impossible : le bouton Télécharger reste disponible.
    }
  }

  const canShareFile =
    clip !== null && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [clip.file] });

  return (
    <div
      className="fixed inset-0 z-[100] select-none overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Téléprompteur"
    >
      {settings.camera && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-black/85 via-black/60 to-transparent" />

      {/* Texte qui défile */}
      <div
        ref={viewportRef}
        onClick={togglePlay}
        className="absolute inset-x-0 top-0 h-[62%] cursor-pointer overflow-hidden px-6 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_80%,transparent)] sm:px-16"
        aria-live="off"
      >
        <div className="mx-auto max-w-3xl pt-[22vh]">
          <div
            ref={textRef}
            data-testid="prompter-text"
            className={cn(
              "whitespace-pre-wrap pb-[40vh] font-semibold leading-[1.35] tracking-tight will-change-transform",
              FONT_CLASSES[settings.fontSize],
              settings.mirror && "-scale-x-100",
            )}
          >
            {script}
          </div>
        </div>
      </div>
      {/* Ligne de lecture */}
      <div className="pointer-events-none absolute inset-x-0 top-[22vh] flex items-center justify-between px-2" aria-hidden>
        <span className="size-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-accent" />
        <span className="size-0 border-y-[7px] border-r-[10px] border-y-transparent border-r-accent" />
      </div>

      {/* Barre du haut */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-black/50 backdrop-blur"
          aria-label="Fermer le prompteur"
        >
          <X className="size-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2">
          {recording === "recording" && (
            <span className="flex items-center gap-1.5 rounded-full bg-danger/90 px-3 py-1 font-mono text-xs" role="status">
              <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden />
              REC {formatClock(elapsed)}
            </span>
          )}
          <span className="rounded-full bg-black/50 px-3 py-1 font-mono text-xs tabular-nums backdrop-blur">
            {settings.wpm} mots/min
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10" aria-hidden>
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Décompte */}
      {phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-live="assertive">
          <span className="text-[120px] font-semibold tabular-nums text-white/90 drop-shadow-lg">
            {countdown > 0 ? countdown : ""}
          </span>
        </div>
      )}

      {cameraState === "denied" && (
        <p className="absolute inset-x-6 bottom-36 rounded-xl bg-black/70 p-3 text-center text-[13px] text-white/80 backdrop-blur">
          Caméra indisponible : autorise-la dans les réglages du navigateur pour te filmer. Le
          prompteur fonctionne sans.
        </p>
      )}

      {/* Commandes */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-6">
        <button
          type="button"
          onClick={() => changeSpeed(-10)}
          className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"
          aria-label="Ralentir"
        >
          <Minus className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={restart}
          className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"
          aria-label="Reprendre au début"
        >
          <RotateCcw className="size-5" aria-hidden />
        </button>
        {canRecord ? (
          <button
            type="button"
            onClick={toggleRecording}
            className="grid size-[72px] place-items-center rounded-full border-4 border-white bg-transparent"
            aria-label={recording === "recording" ? "Arrêter l'enregistrement" : "Enregistrer"}
          >
            {recording === "recording" ? (
              <Square className="size-7 fill-danger text-danger" aria-hidden />
            ) : (
              <Circle className="size-14 fill-danger text-danger" aria-hidden />
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={togglePlay}
          className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur disabled:opacity-40"
          aria-label={phase === "running" ? "Pause" : "Lecture"}
          disabled={phase === "countdown" || phase === "done"}
        >
          {phase === "running" ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => changeSpeed(10)}
          className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"
          aria-label="Accélérer"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>

      {/* Prise terminée */}
      {clip && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-black/90 p-6 backdrop-blur">
          <p className="text-lg font-semibold">Ta prise est prête</p>
          <video
            src={clip.url}
            controls
            playsInline
            className="max-h-[55vh] w-auto max-w-full rounded-2xl bg-black"
            data-testid="studio-clip"
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canShareFile && (
              <button
                type="button"
                onClick={share}
                className="flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-black"
              >
                <Share2 className="size-4" aria-hidden />
                Partager ou enregistrer
              </button>
            )}
            <a
              href={clip.url}
              download={clip.file.name}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold",
                canShareFile ? "bg-white/15" : "bg-accent text-black",
              )}
            >
              <Download className="size-4" aria-hidden />
              Télécharger la vidéo
            </a>
            <button
              type="button"
              onClick={() => {
                setClip(null);
                toggleRecording();
              }}
              className="flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold"
            >
              <RotateCcw className="size-4" aria-hidden />
              Refaire une prise
            </button>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-white/60 underline-offset-4 hover:underline">
            Fermer le studio
          </button>
        </div>
      )}
    </div>
  );
}
