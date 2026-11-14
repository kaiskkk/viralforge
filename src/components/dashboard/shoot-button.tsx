"use client";

import { Clapperboard } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonClasses } from "@/components/ui/button";
import { sendToStudio } from "@/lib/studio";

/** Ouvre le Studio avec ce script dans le téléprompteur. */
export function ShootButton({ script, title }: { script: string; title: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        sendToStudio({ script, title });
        router.push("/dashboard/studio");
      }}
      className={buttonClasses({ variant: "secondary", size: "sm" })}
    >
      <Clapperboard className="size-3.5" aria-hidden />
      Tourner
    </button>
  );
}
