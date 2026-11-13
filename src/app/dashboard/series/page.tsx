import type { Metadata } from "next";

import { SeriesTool } from "@/components/dashboard/tools/series-tool";

export const metadata: Metadata = { title: "Série 7 jours" };

export default function Page() {
  return <SeriesTool />;
}
