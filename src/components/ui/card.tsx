import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("hairline rounded-2xl bg-surface", className)} {...props} />;
}

/** En-tête de carte : petit intitulé à gauche, actions à droite. */
export function CardHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] uppercase tracking-widest text-faint">{eyebrow}</p>}
        <h2 className={cn("break-words text-[15px] font-semibold tracking-tight", eyebrow && "mt-1")}>
          {title}
        </h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
