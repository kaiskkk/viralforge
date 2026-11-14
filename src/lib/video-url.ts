/**
 * Liens de vidéos courtes : reconnaissance de la plateforme. Fichier
 * isomorphe : validation du formulaire comme de l'API.
 */

export type VideoPlatform = "tiktok" | "instagram" | "youtube";

export const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
};

const HOSTS: Record<string, VideoPlatform> = {
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "m.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "vt.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
};

/**
 * Plateforme et URL normalisée (https, sans espaces), ou null si le lien
 * n'est pas une vidéo TikTok, Instagram ou YouTube. Accepte un lien collé
 * sans « https:// ».
 */
export function detectVideoUrl(raw: string): { platform: VideoPlatform; url: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const platform = HOSTS[url.hostname.toLowerCase()];
  if (!platform || url.pathname.length <= 1) return null;
  url.protocol = "https:";
  return { platform, url: url.toString() };
}
