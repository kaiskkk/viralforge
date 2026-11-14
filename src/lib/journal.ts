/**
 * Journal de performance : les vraies statistiques des vidéos publiées, et les
 * tendances qu'on en tire. Calcul local et déterministe : aucune IA, aucune
 * donnée inventée. Sur peu de vidéos, ce sont des tendances, pas des certitudes.
 */

import { z } from "zod";

import { DIRECT_ADDRESS, normalize, scoreHookLine, splitWords, startsWithSlowOpener } from "@/lib/viral-score";

export const JOURNAL_FREE_LIMIT = 5;
/** Nombre de vidéos à partir duquel on cherche des tendances. */
export const INSIGHTS_MIN_LOGS = 3;

export const VIDEO_PLATFORMS = ["tiktok", "reels", "shorts", "other"] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const VIDEO_PLATFORM_LABELS: Record<VideoPlatform, string> = {
  tiktok: "TikTok",
  reels: "Reels",
  shorts: "Shorts",
  other: "Autre",
};

/** Champ numérique de formulaire : vide → null, sinon entier borné. */
const optionalCount = (max: number, message: string) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(String(value).replace(/[\s ]/g, "").replace(",", "."))),
    z.number({ message }).int(message).min(0, message).max(max, message).nullable(),
  );

export const videoLogInputSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre à ta vidéo.").max(200, "Titre trop long (200 caractères max)."),
  platform: z.enum(VIDEO_PLATFORMS, { message: "Choisis la plateforme." }),
  hook: z.string().trim().max(300, "Hook trop long (300 caractères max).").default(""),
  publishedOn: z.iso.date({ message: "Date de publication invalide." }),
  durationSeconds: optionalCount(3600, "Durée invalide (en secondes, 1 h max).").refine((value) => value !== 0, "Durée invalide."),
  views: optionalCount(2_000_000_000, "Nombre de vues invalide.").refine((value) => value !== null, "Indique le nombre de vues."),
  likes: optionalCount(2_000_000_000, "Nombre de likes invalide."),
  comments: optionalCount(2_000_000_000, "Nombre de commentaires invalide."),
  avgWatchPct: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(String(value).replace("%", "").replace(",", ".").trim())),
    z.number({ message: "Rétention invalide (entre 0 et 100 %)." }).min(0, "Rétention invalide (entre 0 et 100 %).").max(100, "Rétention invalide (entre 0 et 100 %).").nullable(),
  ),
});

export type VideoLogInput = z.input<typeof videoLogInputSchema>;

export type VideoLog = {
  id: string;
  title: string;
  platform: VideoPlatform;
  hook: string;
  publishedOn: string;
  durationSeconds: number | null;
  views: number;
  likes: number | null;
  comments: number | null;
  avgWatchPct: number | null;
};

export type JournalInsight = {
  id: string;
  title: string;
  detail: string;
  /** Écart entre les deux groupes comparés (×). Sert à classer les tendances. */
  ratio: number;
};

export type JournalSummary = {
  count: number;
  totalViews: number;
  medianViews: number;
  best: VideoLog | null;
};

export type NextVideoFormula = { label: string; value: string }[];

const NUMBER = new Intl.NumberFormat("fr-FR");
const RATIO = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const formatViews = (value: number) => `${NUMBER.format(Math.round(value))} vue${Math.round(value) > 1 ? "s" : ""}`;
const formatRatio = (ratio: number) => `×${RATIO.format(ratio)}`;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Rapport entre deux médianes, lissé pour qu'un groupe à 0 vue ne donne pas l'infini. */
function ratioOf(a: number, b: number): number {
  return (a + 10) / (b + 10);
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const DURATION_BUCKETS = [
  { id: "under15", label: "moins de 15 s", test: (seconds: number) => seconds < 15 },
  { id: "15to30", label: "15 à 30 s", test: (seconds: number) => seconds >= 15 && seconds <= 30 },
  { id: "30to60", label: "30 à 60 s", test: (seconds: number) => seconds > 30 && seconds <= 60 },
  { id: "over60", label: "plus d'une minute", test: (seconds: number) => seconds > 60 },
];

type HookFeature = { id: string; positive: string; negative: string; test: (hook: string) => boolean; formula: string };

const HOOK_FEATURES: HookFeature[] = [
  {
    id: "number",
    positive: "Tes hooks avec un chiffre font plus de vues",
    negative: "Tes hooks avec un chiffre font moins de vues",
    test: (hook) => /\d/.test(hook),
    formula: "un chiffre dans le hook",
  },
  {
    id: "question",
    positive: "Tes hooks en question font plus de vues",
    negative: "Tes hooks en question font moins de vues",
    test: (hook) => hook.includes("?"),
    formula: "un hook en question",
  },
  {
    id: "direct",
    positive: "Parler directement au spectateur (« tu ») te réussit",
    negative: "Tes hooks en « tu » font moins de vues",
    test: (hook) => splitWords(normalize(hook)).some((word) => DIRECT_ADDRESS.has(word)),
    formula: "un hook qui dit « tu »",
  },
  {
    id: "short",
    positive: "Tes hooks courts (10 mots max) font plus de vues",
    negative: "Tes hooks courts font moins de vues que les longs",
    test: (hook) => splitWords(hook).length <= 10,
    formula: "un hook de 10 mots max",
  },
  {
    id: "greeting",
    positive: "Commencer par une salutation ne te pénalise pas",
    negative: "Commencer par « salut » ou une annonce te coûte des vues",
    test: (hook) => startsWithSlowOpener(hook),
    formula: "aucune salutation au début",
  },
];

/** Compare deux groupes de vidéos par leur médiane de vues. */
function compare(group: VideoLog[], rest: VideoLog[]) {
  const a = median(group.map((log) => log.views));
  const b = median(rest.map((log) => log.views));
  return { a, b, ratio: ratioOf(a, b) };
}

/** Une tendance repose sur au moins deux vidéos : une seule peut être un coup de chance. */
const MIN_GROUP = 2;

const significant = (ratio: number) => ratio >= 1.3 || ratio <= 1 / 1.3;

export function summarize(logs: VideoLog[]): JournalSummary {
  const best = logs.reduce<VideoLog | null>((top, log) => (!top || log.views > top.views ? log : top), null);
  return {
    count: logs.length,
    totalViews: logs.reduce((sum, log) => sum + log.views, 0),
    medianViews: median(logs.map((log) => log.views)),
    best,
  };
}

/**
 * Tendances tirées des vidéos du créateur, de la plus marquée à la plus faible.
 * Chaque tendance compare deux groupes de ses propres vidéos (médiane des vues).
 */
export function computeInsights(logs: VideoLog[]): { insights: JournalInsight[]; formula: NextVideoFormula } {
  const insights: JournalInsight[] = [];
  const formula: NextVideoFormula = [];
  if (logs.length < INSIGHTS_MIN_LOGS) return { insights, formula };

  // 1. Durée
  const timed = logs.filter((log) => log.durationSeconds !== null);
  const buckets = DURATION_BUCKETS.map((bucket) => ({
    ...bucket,
    logs: timed.filter((log) => bucket.test(log.durationSeconds as number)),
  })).filter((bucket) => bucket.logs.length > 0);
  if (buckets.length >= 2) {
    const ranked = buckets
      .map((bucket) => ({ bucket, ...compare(bucket.logs, timed.filter((log) => !bucket.logs.includes(log))) }))
      .filter((entry) => entry.bucket.logs.length >= MIN_GROUP)
      .sort((x, y) => y.a - x.a);
    const top = ranked[0];
    if (top && significant(top.ratio)) {
      insights.push({
        id: "duration",
        title: `Ta durée idéale : ${top.bucket.label}`,
        detail: `Médiane de ${formatViews(top.a)}, contre ${formatViews(top.b)} pour tes autres durées (${formatRatio(top.ratio)}).`,
        ratio: top.ratio,
      });
      formula.push({ label: "Durée", value: top.bucket.label });
    }
  }

  // 2. Forme du hook
  const hooked = logs.filter((log) => log.hook.trim().length > 0);
  const hookInsights: JournalInsight[] = [];
  for (const feature of HOOK_FEATURES) {
    const withIt = hooked.filter((log) => feature.test(log.hook));
    const without = hooked.filter((log) => !feature.test(log.hook));
    if (withIt.length === 0 || without.length === 0 || Math.max(withIt.length, without.length) < MIN_GROUP) continue;
    const { a, b, ratio } = compare(withIt, without);
    if (!significant(ratio)) continue;
    const better = ratio > 1;
    // Une salutation qui « marche » est un cas trop fragile pour être conseillé.
    if (feature.id === "greeting" && better) continue;
    const strength = better ? ratio : 1 / ratio;
    hookInsights.push({
      id: `hook-${feature.id}`,
      title: better ? feature.positive : feature.negative,
      detail: `Médiane de ${formatViews(a)} avec, ${formatViews(b)} sans (${formatRatio(strength)} ${better ? "en faveur" : "au détriment"} de ce style).`,
      ratio: strength,
    });
    if ((better && feature.id !== "greeting") || (!better && feature.id === "greeting")) {
      if (!formula.some((entry) => entry.label === "Hook")) formula.push({ label: "Hook", value: feature.formula });
    }
  }
  insights.push(...hookInsights.sort((x, y) => y.ratio - x.ratio).slice(0, 2));

  // 3. Le score de hook de ViralForge confronté à tes vues réelles
  if (hooked.length >= 4) {
    const scored = hooked.map((log) => ({ log, score: scoreHookLine(log.hook).score }));
    const strong = scored.filter((entry) => entry.score >= 60).map((entry) => entry.log);
    const weak = scored.filter((entry) => entry.score < 60).map((entry) => entry.log);
    if (strong.length > 0 && weak.length > 0) {
      const { a, b, ratio } = compare(strong, weak);
      if (ratio >= 1.3) {
        insights.push({
          id: "hook-score",
          title: "Le score de hook prédit tes vues",
          detail: `Tes hooks notés 60+ par ViralForge font une médiane de ${formatViews(a)}, contre ${formatViews(b)} pour les autres (${formatRatio(ratio)}). Teste chaque hook au Labo avant de tourner.`,
          ratio,
        });
      }
    }
  }

  // 4. Plateforme
  const platforms = VIDEO_PLATFORMS.map((platform) => ({ platform, logs: logs.filter((log) => log.platform === platform) })).filter(
    (group) => group.logs.length > 0,
  );
  if (platforms.length >= 2) {
    const ranked = platforms
      .map((group) => ({ group, ...compare(group.logs, logs.filter((log) => log.platform !== group.platform)) }))
      .filter((entry) => entry.group.logs.length >= MIN_GROUP)
      .sort((x, y) => y.a - x.a);
    const top = ranked[0];
    if (top && significant(top.ratio)) {
      const label = VIDEO_PLATFORM_LABELS[top.group.platform];
      insights.push({
        id: "platform",
        title: `${label} te rapporte le plus`,
        detail: `Médiane de ${formatViews(top.a)} sur ${label}, contre ${formatViews(top.b)} ailleurs (${formatRatio(top.ratio)}).`,
        ratio: top.ratio,
      });
      formula.push({ label: "Plateforme", value: label });
    }
  }

  // 5. Jour de publication
  if (logs.length >= 4) {
    const days = new Map<number, VideoLog[]>();
    for (const log of logs) {
      const day = new Date(`${log.publishedOn}T12:00:00Z`).getUTCDay();
      days.set(day, [...(days.get(day) ?? []), log]);
    }
    if (days.size >= 2) {
      const ranked = [...days.entries()]
        .filter(([, group]) => group.length >= MIN_GROUP)
        .map(([day, group]) => ({ day, ...compare(group, logs.filter((log) => !group.includes(log))) }))
        .sort((x, y) => y.a - x.a);
      const top = ranked[0];
      if (top && significant(top.ratio)) {
        insights.push({
          id: "weekday",
          title: `Publie plutôt le ${WEEKDAYS[top.day]}`,
          detail: `Tes vidéos du ${WEEKDAYS[top.day]} font une médiane de ${formatViews(top.a)}, contre ${formatViews(top.b)} les autres jours (${formatRatio(top.ratio)}).`,
          ratio: top.ratio,
        });
        formula.push({ label: "Jour", value: WEEKDAYS[top.day] });
      }
    }
  }

  // 6. Rétention moyenne
  const watched = logs.filter((log) => log.avgWatchPct !== null);
  if (watched.length >= 4) {
    const threshold = median(watched.map((log) => log.avgWatchPct as number));
    const high = watched.filter((log) => (log.avgWatchPct as number) > threshold);
    const low = watched.filter((log) => (log.avgWatchPct as number) <= threshold);
    if (high.length > 0 && low.length > 0) {
      const { a, b, ratio } = compare(high, low);
      if (ratio >= 1.3) {
        insights.push({
          id: "retention",
          title: "La rétention est ton levier n° 1",
          detail: `Quand plus de ${Math.round(threshold)} % de la vidéo est regardée, tu fais une médiane de ${formatViews(a)}, contre ${formatViews(b)} (${formatRatio(ratio)}). Passe chaque script dans la Courbe de rétention.`,
          ratio,
        });
      }
    }
  }

  // 7. Engagement
  const engaged = logs.filter((log) => log.views >= 100 && (log.likes !== null || log.comments !== null));
  if (engaged.length >= 3) {
    const rate = (log: VideoLog) => ((log.likes ?? 0) + (log.comments ?? 0) * 3) / log.views;
    const best = engaged.reduce((top, log) => (rate(log) > rate(top) ? log : top));
    const typical = median(engaged.map(rate));
    const ratio = ratioOf(rate(best) * 1000, typical * 1000);
    if (ratio >= 1.5) {
      insights.push({
        id: "engagement",
        title: "Ta vidéo qui crée le plus de lien",
        detail: `« ${best.title} » engage ${formatRatio(rate(best) / Math.max(typical, 1e-6))} plus que ta moyenne (likes et commentaires par vue). Refais ce format : c'est celui que ton audience veut.`,
        ratio: Math.min(ratio, 5),
      });
    }
  }

  return { insights: insights.sort((x, y) => y.ratio - x.ratio), formula };
}

/** Ligne de la table video_logs → VideoLog. */
export function videoLogFromRow(row: {
  id: string;
  title: string;
  platform: VideoPlatform;
  hook: string;
  published_on: string;
  duration_seconds: number | null;
  views: number;
  likes: number | null;
  comments: number | null;
  avg_watch_pct: number | string | null;
}): VideoLog {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    hook: row.hook,
    publishedOn: row.published_on,
    durationSeconds: row.duration_seconds,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    // numeric arrive en chaîne depuis PostgREST.
    avgWatchPct: row.avg_watch_pct === null ? null : Number(row.avg_watch_pct),
  };
}
