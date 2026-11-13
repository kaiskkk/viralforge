import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-300px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-accent/[0.1] blur-[130px]"
        aria-hidden
      />
      <div className="relative w-full max-w-[380px]">
        <Link href="/" className="mb-8 flex justify-center" aria-label="ViralForge, accueil">
          <Logo />
        </Link>
        {children}
      </div>
    </div>
  );
}
