/**
 * Squelette affiché instantanément à chaque navigation dans le tableau de bord,
 * pendant que la page (rendue à la demande) se charge. Le clic ne « gèle » plus.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-center gap-4">
        <div className="size-11 shrink-0 rounded-xl bg-white/[0.05]" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-md bg-white/[0.06]" />
          <div className="h-3 w-72 max-w-full rounded-md bg-white/[0.04]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="h-64 rounded-2xl border border-white/[0.06] bg-surface" />
        <div className="h-64 rounded-2xl border border-dashed border-white/[0.1]" />
      </div>
      <div className="relative h-3 w-40 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>
    </div>
  );
}
