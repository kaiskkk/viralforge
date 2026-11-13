import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "/#simulateur", label: "Simulateur" },
  { href: "/#outils", label: "Outils" },
  { href: "/pricing", label: "Tarifs" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="ViralForge, accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Connexion
          </Link>
          <Link href="/signup" className={buttonClasses({ size: "sm" })}>
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
