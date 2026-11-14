"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copier",
  className,
  compact = false,
  variant = "secondary",
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
  /** Icône seule (le libellé reste lu par les lecteurs d'écran). */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission refusée).
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={buttonClasses({
        variant,
        size: "sm",
        className: compact ? `size-8 shrink-0 px-0 ${className ?? ""}` : className,
      })}
    >
      {copied ? (
        <Check className={variant === "primary" ? "size-3.5" : "size-3.5 text-accent"} aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite" className={compact ? "sr-only" : undefined}>
        {copied ? "Copié" : label}
      </span>
    </button>
  );
}
