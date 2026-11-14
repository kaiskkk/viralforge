import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

/** Page introuvable à l'intérieur du dashboard (script supprimé, lien erroné…). */
export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center" data-testid="dashboard-not-found">
      <div>
        <p className="font-mono text-sm text-faint">Introuvable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Cette page n&apos;existe pas (ou plus)</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Le script a peut-être été supprimé, ou le lien est incomplet.
        </p>
        <Link href="/dashboard" className={buttonClasses({ className: "mt-6" })}>
          <ArrowLeft className="size-4" aria-hidden />
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
