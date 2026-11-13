import type { Metadata } from "next";

import { AntiDropoffTool } from "@/components/dashboard/tools/anti-dropoff-tool";

export const metadata: Metadata = { title: "Anti-Dropoff" };

export default function Page() {
  return <AntiDropoffTool />;
}
