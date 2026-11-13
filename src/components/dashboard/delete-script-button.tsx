"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { deleteScript } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

/**
 * Suppression en deux temps : un premier clic arme le bouton, un second
 * confirme. Le bouton se désarme seul après quelques secondes.
 */
export function DeleteScriptButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timeout);
  }, [armed]);

  function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteScript(id);
      if (!result.ok) {
        setError(result.error);
        setArmed(false);
      } else if (redirectTo) {
        router.push(redirectTo);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={error ?? undefined}
      aria-label={armed ? "Confirmer la suppression" : "Supprimer ce script"}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors",
        armed || error
          ? "bg-danger/15 text-danger"
          : "text-faint hover:bg-white/[0.06] hover:text-fg",
      )}
    >
      {pending ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-3.5" aria-hidden />
      )}
      {error ? "Échec, réessayer" : armed ? "Confirmer" : null}
    </button>
  );
}
