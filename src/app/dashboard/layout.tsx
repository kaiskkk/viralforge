import type { Metadata } from "next";

import { CreditsProvider } from "@/components/dashboard/credits-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · ViralForge" },
  robots: { index: false },
};

// Pages propres à chaque utilisateur : jamais pré-rendues ni mises en cache.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();

  return (
    <CreditsProvider plan={viewer.plan} initialCredits={viewer.credits}>
      <Sidebar email={viewer.email} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</div>
      </main>
    </CreditsProvider>
  );
}
