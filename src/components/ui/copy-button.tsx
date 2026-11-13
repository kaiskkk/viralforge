"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copier",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
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
      className={buttonClasses({ variant: "secondary", size: "sm", className })}
    >
      {copied ? (
        <Check className="size-3.5 text-accent" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copié" : label}</span>
    </button>
  );
}
