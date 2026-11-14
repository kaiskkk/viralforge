import { z } from "zod";

/**
 * Profil créateur : ce que les outils savent du créateur pour écrire dans sa
 * voix. Fichier isomorphe : formulaire, Server Action et prompts.
 */

export const TONES = ["Direct", "Drôle", "Inspirant", "Pédagogique", "Provocateur", "Bienveillant"] as const;
export const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "Toutes"] as const;

export const PROFILE_LIMITS = { niche: 120, audience: 200, tone: 40, platform: 40, styleNotes: 500 } as const;

const field = (max: number, label: string) =>
  z.string().trim().max(max, `${label} : ${max} caractères maximum.`);

export const creatorProfileSchema = z.object({
  niche: field(PROFILE_LIMITS.niche, "Niche"),
  audience: field(PROFILE_LIMITS.audience, "Audience"),
  tone: field(PROFILE_LIMITS.tone, "Ton"),
  platform: field(PROFILE_LIMITS.platform, "Plateforme"),
  styleNotes: field(PROFILE_LIMITS.styleNotes, "Style"),
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;

export const EMPTY_PROFILE: CreatorProfile = { niche: "", audience: "", tone: "", platform: "", styleNotes: "" };

export function isProfileEmpty(profile: CreatorProfile | null | undefined): boolean {
  return !profile || Object.values(profile).every((value) => !value.trim());
}

/** Résumé court, ex. « Finances perso · ton drôle ». */
export function profileSummary(profile: CreatorProfile): string {
  const parts = [profile.niche, profile.tone && `ton ${profile.tone.toLowerCase()}`].filter(Boolean);
  return parts.join(" · ") || "Profil renseigné";
}

/** Ligne de la base → profil. */
export function profileFromRow(row: {
  niche: string;
  audience: string;
  tone: string;
  platform: string;
  style_notes: string;
}): CreatorProfile {
  return {
    niche: row.niche,
    audience: row.audience,
    tone: row.tone,
    platform: row.platform,
    styleNotes: row.style_notes,
  };
}
