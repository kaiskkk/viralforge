"use client";

import {
  Bookmark,
  Clapperboard,
  Infinity as InfinityIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CheckoutLink } from "@/components/checkout-link";
import { useCredits } from "@/components/dashboard/credits-context";
import { ToolIcon } from "@/components/tool-icon";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { FREE_CREDITS } from "@/lib/plans";
import { TOOL_IDS, TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const OVERVIEW: NavItem = {
  href: "/dashboard",
  label: "Vue d'ensemble",
  icon: <LayoutDashboard className="size-4" aria-hidden />,
};
const TOOL_ITEMS: NavItem[] = TOOL_IDS.map((id) => ({
  href: TOOLS[id].href,
  label: TOOLS[id].shortName,
  icon: <ToolIcon tool={id} className="size-4" />,
}));
const STUDIO: NavItem = {
  href: "/dashboard/studio",
  label: "Studio",
  icon: <Clapperboard className="size-4" aria-hidden />,
};
const SAVED: NavItem = {
  href: "/dashboard/saved",
  label: "Scripts sauvegardés",
  icon: <Bookmark className="size-4" aria-hidden />,
};
const PROFILE: NavItem = {
  href: "/dashboard/profile",
  label: "Profil créateur",
  icon: <UserRound className="size-4" aria-hidden />,
};

const GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [OVERVIEW] },
  { title: "Écrire", items: TOOL_ITEMS },
  { title: "Tourner", items: [STUDIO] },
  { title: "Toi", items: [SAVED, PROFILE] },
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

/** Feuille « Outils » du téléphone : les quatre outils d'écriture. */
function ToolsSheet({ onClose }: { onClose: () => void }) {
  const isActive = useIsActive();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Outils">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div className="absolute inset-x-0 bottom-0 animate-fade-up rounded-t-3xl border-t border-white/[0.08] bg-surface p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-semibold">Outils d&apos;écriture</p>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-white/[0.06]" aria-label="Fermer">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ul className="space-y-1.5">
          {TOOL_IDS.map((id) => (
            <li key={id}>
              <Link
                href={TOOLS[id].href}
                onClick={onClose}
                aria-current={isActive(TOOLS[id].href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-3 transition-colors",
                  isActive(TOOLS[id].href) ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <ToolIcon tool={id} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{TOOLS[id].name}</span>
                  <span className="line-clamp-1 block text-xs text-muted">{TOOLS[id].tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Sidebar({ email }: { email: string }) {
  const isActive = useIsActive();
  const pathname = usePathname();
  const { plan, credits } = useCredits();
  const [toolsOpen, setToolsOpen] = useState(false);

  // La feuille se referme quand on change de page.
  useEffect(() => setToolsOpen(false), [pathname]);

  const onToolPage = TOOL_ITEMS.some((item) => isActive(item.href));
  const tabs = [
    { href: OVERVIEW.href, label: "Accueil", icon: <LayoutDashboard className="size-5" aria-hidden /> },
    { href: null, label: "Outils", icon: <LayoutGrid className="size-5" aria-hidden /> },
    { href: STUDIO.href, label: "Studio", icon: <Clapperboard className="size-5" aria-hidden /> },
    { href: SAVED.href, label: "Scripts", icon: <Bookmark className="size-5" aria-hidden /> },
    { href: PROFILE.href, label: "Profil", icon: <UserRound className="size-5" aria-hidden /> },
  ];

  return (
    <>
      {/* Ordinateur : colonne fixe */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-surface/60 lg:flex">
        <Link href="/dashboard" className="flex h-16 shrink-0 items-center px-5" aria-label="ViralForge, dashboard">
          <Logo />
        </Link>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Dashboard">
          {GROUPS.map((group, index) => (
            <div key={group.title ?? index}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-widest text-faint">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
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
              </div>
            </div>
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

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
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
      </header>

      {/* Téléphone : barre d'onglets du bas */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/[0.08] bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navigation principale"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((tab) => {
            const active = tab.href ? isActive(tab.href) : onToolPage || toolsOpen;
            const content = (
              <>
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent/15")}>
                  {tab.icon}
                </span>
                <span className="text-[11px]">{tab.label}</span>
              </>
            );
            const className = cn(
              "flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors",
              active ? "text-accent" : "text-muted",
            );
            return (
              <li key={tab.label}>
                {tab.href ? (
                  <Link href={tab.href} aria-current={active ? "page" : undefined} className={className}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setToolsOpen((open) => !open)}
                    aria-expanded={toolsOpen}
                    className={className}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {toolsOpen && <ToolsSheet onClose={() => setToolsOpen(false)} />}
    </>
  );
}
