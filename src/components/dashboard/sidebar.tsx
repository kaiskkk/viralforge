"use client";

import { Bookmark, Infinity as InfinityIcon, LayoutDashboard, LogOut, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CheckoutLink } from "@/components/checkout-link";
import { useCredits } from "@/components/dashboard/credits-context";
import { ToolIcon } from "@/components/tool-icon";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { FREE_CREDITS } from "@/lib/plans";
import { TOOL_IDS, TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: <LayoutDashboard className="size-4" aria-hidden /> },
  ...TOOL_IDS.map((id) => ({
    href: TOOLS[id].href,
    label: TOOLS[id].shortName,
    icon: <ToolIcon tool={id} className="size-4" />,
  })),
  { href: "/dashboard/saved", label: "Scripts sauvegardés", icon: <Bookmark className="size-4" aria-hidden /> },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function CreditsCard() {
  const { plan, credits } = useCredits();

  if (plan === "pro") {
    return (
      <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-accent">
          <InfinityIcon className="size-4" aria-hidden />
          Plan Pro
        </p>
        <p className="mt-1 text-xs text-muted">Générations illimitées</p>
      </div>
    );
  }

  const shown = Math.min(credits, FREE_CREDITS);
  return (
    <div className="hairline rounded-xl bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium">Crédits</p>
        <p className="font-mono text-xs tabular-nums text-muted">
          <span className={cn("text-sm font-semibold", credits > 0 ? "text-fg" : "text-danger")}>
            {credits}
          </span>{" "}
          / {Math.max(credits, FREE_CREDITS)}
        </p>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: FREE_CREDITS }, (_, index) => (
          <span
            key={index}
            className={cn("h-1 flex-1 rounded-full", index < shown ? "bg-accent" : "bg-white/[0.08]")}
          />
        ))}
      </div>
      <CheckoutLink className={buttonClasses({ size: "sm", className: "mt-4 w-full" })}>
        <Zap className="size-3.5" aria-hidden />
        Passer en Pro
      </CheckoutLink>
    </div>
  );
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className={cn(
          "grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-fg",
          className,
        )}
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </form>
  );
}

export function Sidebar({ email }: { email: string }) {
  const isActive = useIsActive();
  const { plan, credits } = useCredits();

  return (
    <>
      {/* Bureau : colonne fixe */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-surface/60 lg:flex">
        <Link href="/dashboard" className="flex h-16 items-center px-5" aria-label="ViralForge, dashboard">
          <Logo />
        </Link>

        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Dashboard">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-white/[0.07] font-medium text-fg"
                  : "text-muted hover:bg-white/[0.04] hover:text-fg",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 p-3">
          <CreditsCard />
          <div className="flex items-center justify-between gap-2 pl-2">
            <p className="truncate text-xs text-muted" title={email}>
              {email}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile : barre supérieure + onglets défilants */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/80 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" aria-label="ViralForge, dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hairline rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs tabular-nums text-muted"
            >
              {plan === "pro" ? (
                <span className="text-accent">Pro · illimité</span>
              ) : (
                <>
                  <span className={credits > 0 ? "text-fg" : "text-danger"}>{credits}</span> crédit
                  {credits > 1 ? "s" : ""}
                </>
              )}
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label="Dashboard">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors",
                isActive(item.href) ? "bg-white/[0.08] font-medium text-fg" : "text-muted",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
