import { ArrowRight, ClipboardPaste, ScanSearch, Send } from "lucide-react";
import Link from "next/link";

import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { ToolsShowcase } from "@/components/marketing/tools-showcase";
import { ViralSimulator } from "@/components/marketing/viral-simulator";
import { buttonClasses } from "@/components/ui/button";
import { CHECKOUT_URL, FREE_CREDITS } from "@/lib/plans";

const STEPS = [
  {
    icon: ClipboardPaste,
    title: "Colle ton script",
    text: "Ou celui d'une vidéo qui a explosé dans ta niche. Aucune mise en forme à prévoir.",
  },
  {
    icon: ScanSearch,
    title: "ViralForge le décortique",
    text: "Structure, passages lents, points de décrochage : tu vois précisément ce qui retient et ce qui fait fuir.",
  },
  {
    icon: Send,
    title: "Publie la version qui retient",
    text: "Tu repars avec un script réécrit, prêt à être dit face caméra, que tu peux sauvegarder.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero + simulateur */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-[-280px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.13] blur-[130px]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/signup"
              className="hairline inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:text-fg"
            >
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent))]" />
              {FREE_CREDITS} crédits offerts, sans carte bancaire
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>

            <h1
              className="mt-7 animate-fade-up text-[44px] font-semibold leading-[1.04] tracking-tightest sm:text-7xl"
              style={{ animationDelay: "60ms" }}
            >
              <span className="text-gradient">Forge des scripts que </span>
              <span className="text-accent">personne ne swipe.</span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-xl animate-fade-up text-[17px] leading-relaxed text-muted"
              style={{ animationDelay: "120ms" }}
            >
              ViralForge décortique la mécanique des vidéos virales et réécrit tes scripts TikTok,
              Reels et Shorts pour retenir l&apos;attention, de la première seconde à la dernière.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: "180ms" }}
            >
              <a href="#simulateur" className={buttonClasses({ size: "lg" })}>
                Tester mon script
              </a>
              <Link href="/signup" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Créer un compte gratuit
              </Link>
            </div>
          </div>

          <div
            id="simulateur"
            className="mt-16 scroll-mt-24 animate-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            <ViralSimulator />
          </div>
        </div>
      </section>

      <ToolsShowcase />

      {/* Fonctionnement */}
      <section className="border-y border-white/[0.06] bg-white/[0.012] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-semibold tracking-tightest sm:text-[40px]">
            <span className="text-gradient">Du brouillon au script qui tient.</span>
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="hairline grid size-10 place-items-center rounded-xl bg-surface text-accent">
                    <step.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tightest sm:text-[40px]">
              <span className="text-gradient">Commence gratuitement.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              {FREE_CREDITS} générations offertes pour juger sur pièces. Passe en Pro quand tu
              publies tous les jours.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards
              free={{ label: "Créer un compte gratuit", href: "/signup" }}
              pro={{ label: "Passer en Pro", href: CHECKOUT_URL, external: true }}
            />
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.06]">
        <Faq />
      </div>

      {/* Appel final */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-20 sm:py-28">
        <div
          className="pointer-events-none absolute bottom-[-320px] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/[0.12] blur-[130px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-tightest sm:text-5xl">
            <span className="text-gradient">Ton prochain script mérite d&apos;être regardé jusqu&apos;au bout.</span>
          </h2>
          <Link href="/signup" className={buttonClasses({ size: "lg", className: "mt-9" })}>
            Commencer avec {FREE_CREDITS} crédits offerts
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
