import type { Metadata } from "next";

import { SettingsView } from "@/components/dashboard/settings/settings-view";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await requireViewer();
  return <SettingsView email={viewer.email} />;
}
