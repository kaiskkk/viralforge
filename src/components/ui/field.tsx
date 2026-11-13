import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-fg placeholder:text-faint transition-colors hover:border-white/[0.14] focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-[13px] font-medium text-fg", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11 px-3.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "resize-y px-3.5 py-3 leading-relaxed", className)} {...props} />;
}

/** Compteur de caractères affiché sous un champ. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={cn("font-mono text-xs tabular-nums", over ? "text-danger" : "text-faint")}>
      {value.length.toLocaleString("fr-FR")} / {max.toLocaleString("fr-FR")}
    </span>
  );
}
