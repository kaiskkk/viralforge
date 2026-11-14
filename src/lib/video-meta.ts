import "server-only";

import { NO_VIDEO_SOURCE, type VideoSource } from "@/lib/tools";
import { detectVideoUrl, type VideoPlatform } from "@/lib/video-url";

/**
 * Informations publiques d'une vidéo, lues via oEmbed (titre ou légende,
 * auteur, miniature). Ne lève jamais d'erreur : un lien illisible (Instagram,
 * vidéo privée, plateforme qui bloque) donne une source « link », et le
 * Blueprint se construit alors à partir de la niche.
 */

const OEMBED_ENDPOINTS: Partial<Record<VideoPlatform, string>> = {
  youtube: process.env.OEMBED_YOUTUBE_URL?.trim() || "https://www.youtube.com/oembed",
  tiktok: process.env.OEMBED_TIKTOK_URL?.trim() || "https://www.tiktok.com/oembed",
  // Instagram exige un jeton d'application Meta pour son oEmbed : pas de lecture possible.
};

const TIMEOUT_MS = 5_000;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function cleanImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function fetchVideoSource(rawUrl: string): Promise<VideoSource> {
  const detected = detectVideoUrl(rawUrl);
  if (!detected) return NO_VIDEO_SOURCE;

  const unreadable: VideoSource = { ...NO_VIDEO_SOURCE, status: "link", platform: detected.platform, url: detected.url };
  const endpoint = OEMBED_ENDPOINTS[detected.platform];
  if (!endpoint) return unreadable;

  try {
    const response = await fetch(`${endpoint}?url=${encodeURIComponent(detected.url)}&format=json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(`[video-meta] oEmbed ${detected.platform} : HTTP ${response.status}`);
      return unreadable;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const title = clean(data.title, 300);
    const author = clean(data.author_name, 100);
    if (!title && !author) return unreadable;
    return {
      status: "oembed",
      platform: detected.platform,
      url: detected.url,
      title,
      author,
      thumbnailUrl: cleanImageUrl(data.thumbnail_url),
    };
  } catch (error) {
    console.warn(`[video-meta] oEmbed ${detected.platform} injoignable`, error instanceof Error ? error.message : error);
    return unreadable;
  }
}
