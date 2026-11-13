import type { Metadata } from "next";

import { CloneTool } from "@/components/dashboard/tools/clone-tool";

export const metadata: Metadata = { title: "Cloneur de Structure Virale" };

export default function Page() {
  return <CloneTool />;
}
