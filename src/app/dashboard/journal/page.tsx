import type { Metadata } from "next";

import { JournalView } from "@/components/dashboard/journal/journal-view";
import { requireViewer } from "@/lib/auth";
import { videoLogFromRow, type VideoLog } from "@/lib/journal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journal de performance" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await requireViewer();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("video_logs")
    .select("id, title, platform, hook, published_on, duration_seconds, views, likes, comments, avg_watch_pct")
    .eq("user_id", viewer.id)
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) console.error("[journal]", error);
  const logs: VideoLog[] = (data ?? []).map(videoLogFromRow);

  return <JournalView initialLogs={logs} unavailable={Boolean(error)} />;
}
