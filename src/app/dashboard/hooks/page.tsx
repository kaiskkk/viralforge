import type { Metadata } from "next";

import { HooksTool } from "@/components/dashboard/tools/hooks-tool";

export const metadata: Metadata = { title: "Labo à hooks" };

export default function Page() {
  return <HooksTool />;
}
