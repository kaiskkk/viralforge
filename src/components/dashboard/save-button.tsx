"use client";

import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { saveScript, type SaveScriptPayload } from "@/app/dashboard/actions";
import { buttonClasses } from "@/components/ui/button";

export function SaveButton({ payload }: { payload: SaveScriptPayload }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveScript(payload);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={save}
        disabled={pending || saved}
        className={buttonClasses({ variant: "secondary", size: "sm", className: "disabled:opacity-100" })}
      >
        {pending ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : saved ? (
          <BookmarkCheck className="size-3.5 text-accent" aria-hidden />
        ) : (
          <Bookmark className="size-3.5" aria-hidden />
        )}
        {saved ? "Sauvegardé" : "Sauvegarder"}
      </button>
    </div>
  );
}
