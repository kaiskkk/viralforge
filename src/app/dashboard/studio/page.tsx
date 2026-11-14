import type { Metadata } from "next";

import { Studio } from "@/components/dashboard/studio/studio";

export const metadata: Metadata = { title: "Studio" };

export default function Page() {
  return <Studio />;
}
