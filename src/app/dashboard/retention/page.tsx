import type { Metadata } from "next";

import { RetentionTool } from "@/components/dashboard/tools/retention-tool";

export const metadata: Metadata = { title: "Courbe de rétention" };

export default function Page() {
  return <RetentionTool />;
}
