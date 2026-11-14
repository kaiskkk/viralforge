import Link from "next/link";

import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "/#simulateur", label: "Simulateur" },
  { href: "/#outils", label: "Outils" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/login", label: "Connexion" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-[13px] text-faint">
            © {new Date().getFullYear()} ViralForge. Scripts générés par IA.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pied de page">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
