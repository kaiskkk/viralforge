import { z } from "zod";

import { detectVideoUrl } from "@/lib/video-url";

/**
 * Contrat des trois outils : métadonnées, schémas d'entrée (validation de la
 * requête) et schémas de sortie (format JSON imposé à Claude).
 * Fichier isomorphe : importé par l'API comme par les composants client.
 */

export const TOOL_IDS = ["clone", "antidropoff", "series", "hooks", "blueprint"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/** Les outils d'écriture classiques (grilles, menus). Le Blueprint a sa place à part, en tête du dashboard. */
export const WRITING_TOOL_IDS = ["clone", "antidropoff", "series", "hooks"] as const satisfies readonly ToolId[];
export type WritingToolId = (typeof WRITING_TOOL_IDS)[number];

export const TOOLS: Record<
  ToolId,
  { id: ToolId; name: string; shortName: string; tagline: string; href: string }
> = {
  clone: {
    id: "clone",
    name: "Cloneur de Structure Virale",
    shortName: "Cloneur",
    tagline:
      "Extrait la structure psychologique d'un script qui a marché et la réapplique à ton sujet.",
    href: "/dashboard/clone",
  },
  antidropoff: {
    id: "antidropoff",
    name: "Anti-Dropoff",
    shortName: "Anti-Dropoff",
    tagline:
      "Surligne les passages qui font swiper et propose une réécriture punchy pour chacun.",
    href: "/dashboard/anti-dropoff",
  },
  series: {
    id: "series",
    name: "Générateur de Série 7 jours",
    shortName: "Série 7 jours",
    tagline: "Sept scripts reliés par des cliffhangers, un par jour.",
    href: "/dashboard/series",
  },
  hooks: {
    id: "hooks",
    name: "Labo à hooks",
    shortName: "Labo à hooks",
    tagline: "Dix accroches pour la même vidéo, classées par force, pour garder la meilleure.",
    href: "/dashboard/hooks",
  },
  blueprint: {
    id: "blueprint",
    name: "Video-to-Viral Blueprint",
    shortName: "Blueprint vidéo",
    tagline:
      "Colle le lien d'une vidéo virale : tu reçois son plan seconde par seconde et ton script prêt à tourner, adapté à ta niche.",
    href: "/dashboard#blueprint",
  },
};

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export const SCRIPT_MIN_CHARS = 40;
export const SCRIPT_MAX_CHARS = 8000;
export const TOPIC_MAX_CHARS = 300;

const scriptField = z
  .string()
  .trim()
  .min(SCRIPT_MIN_CHARS, `Le script doit faire au moins ${SCRIPT_MIN_CHARS} caractères.`)
  .max(SCRIPT_MAX_CHARS, `Le script ne peut pas dépasser ${SCRIPT_MAX_CHARS} caractères.`);

const topicField = z
  .string()
  .trim()
  .min(3, "Décris le sujet en quelques mots.")
  .max(TOPIC_MAX_CHARS, `Le sujet ne peut pas dépasser ${TOPIC_MAX_CHARS} caractères.`);

export const cloneInputSchema = z.object({
  sourceScript: scriptField,
  newTopic: topicField,
});

export const antiDropoffInputSchema = z.object({
  script: scriptField,
});

export const seriesInputSchema = z.object({
  topic: topicField,
  audience: z
    .string()
    .trim()
    .max(200, "L'audience ne peut pas dépasser 200 caractères.")
    .optional(),
});

export const hooksInputSchema = z.object({
  topic: topicField,
  audience: z
    .string()
    .trim()
    .max(200, "L'audience ne peut pas dépasser 200 caractères.")
    .optional(),
});

export const blueprintInputSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500, "Ce lien est trop long.")
    .refine((value) => value === "" || detectVideoUrl(value) !== null, {
      message: "Colle un lien TikTok, Instagram Reels ou YouTube Shorts, ou laisse le champ vide.",
    }),
  niche: z
    .string()
    .trim()
    .min(2, "Indique ta niche ou ton sujet.")
    .max(120, "La niche ne peut pas dépasser 120 caractères."),
});

export const generateRequestSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("clone"), input: cloneInputSchema }),
  z.object({ tool: z.literal("antidropoff"), input: antiDropoffInputSchema }),
  z.object({ tool: z.literal("series"), input: seriesInputSchema }),
  z.object({ tool: z.literal("hooks"), input: hooksInputSchema }),
  z.object({ tool: z.literal("blueprint"), input: blueprintInputSchema }),
]);

export type CloneInput = z.infer<typeof cloneInputSchema>;
export type AntiDropoffInput = z.infer<typeof antiDropoffInputSchema>;
export type SeriesInput = z.infer<typeof seriesInputSchema>;
export type HooksInput = z.infer<typeof hooksInputSchema>;
export type BlueprintInput = z.infer<typeof blueprintInputSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// ---------------------------------------------------------------------------
// Sorties (les .describe() sont transmis à Claude avec le schéma)
// ---------------------------------------------------------------------------

export const cloneOutputSchema = z.object({
  structureSummary: z
    .string()
    .describe("La mécanique psychologique du script source, en deux phrases maximum."),
  beats: z
    .array(
      z.object({
        label: z.string().describe("Nom court du battement, ex. « Hook contre-intuitif »."),
        trigger: z
          .string()
          .describe("Ce que ce passage provoque chez le spectateur, en une phrase."),
        sourceExcerpt: z
          .string()
          .describe("L'extrait du script source qui porte ce battement, cité tel quel."),
        newText: z.string().describe("Le passage équivalent dans le nouveau script."),
      }),
    )
    .describe("Les battements du script, dans l'ordre."),
  title: z.string().describe("Titre de travail du nouveau script."),
  script: z
    .string()
    .describe("Le nouveau script complet, prêt à être dit : les newText mis bout à bout."),
});

export const SEGMENT_STATUSES = ["strong", "slow", "critical"] as const;
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];

export const antiDropoffOutputSchema = z.object({
  retentionScore: z
    .number()
    .describe("Capacité du script à retenir jusqu'au bout, de 0 à 100."),
  verdict: z.string().describe("Diagnostic global en une ou deux phrases."),
  segments: z
    .array(
      z.object({
        text: z.string().describe("Le passage du script original, mot pour mot."),
        status: z.enum(SEGMENT_STATUSES),
        reason: z
          .string()
          .nullable()
          .describe("Pourquoi on swipe ici. null si le statut est strong."),
        rewrite: z
          .string()
          .nullable()
          .describe("Réécriture punchy qui remplace ce passage. null si strong."),
      }),
    )
    .describe("Le script original découpé en passages consécutifs, sans rien omettre."),
  improvedScript: z.string().describe("Le script complet avec les réécritures intégrées."),
});

export const SERIES_LENGTH = 7;

export const seriesOutputSchema = z.object({
  seriesTitle: z.string().describe("Nom de la série."),
  arc: z.string().describe("Le fil rouge des 7 épisodes, en deux phrases maximum."),
  episodes: z
    .array(
      z.object({
        day: z.number().describe("Numéro du jour, de 1 à 7."),
        title: z.string().describe("Titre de l'épisode."),
        hook: z.string().describe("La première phrase du script."),
        script: z.string().describe("Le script complet de l'épisode, hook et chute compris."),
        cliffhanger: z
          .string()
          .describe("La dernière phrase du script, qui donne envie de voir la suite."),
      }),
    )
    .describe("Exactement 7 épisodes, du jour 1 au jour 7."),
});

/** Nombre d'accroches demandées ; on en accepte un peu moins si le modèle en oublie. */
export const HOOKS_COUNT = 10;
export const HOOKS_MIN = 6;

export const hooksOutputSchema = z.object({
  hooks: z
    .array(
      z.object({
        text: z
          .string()
          .describe("L'accroche, telle qu'elle sera dite face caméra : 15 mots maximum."),
        angle: z
          .string()
          .describe(
            "L'angle, en un mot : curiosité, contre-intuitif, chiffre, question, douleur, promesse, histoire, défi, comparaison ou secret.",
          ),
        why: z.string().describe("Pourquoi elle arrête le pouce, en une phrase."),
      }),
    )
    .describe("Exactement 10 accroches, toutes différentes, avec des angles variés."),
});

/**
 * Ce que le site a pu lire de la vidéo source. « oembed » : titre et auteur
 * publics ; « link » : lien reconnu mais illisible (Instagram, vidéo privée…) ;
 * « none » : pas de lien, blueprint construit à partir de la niche.
 */
export const videoSourceSchema = z.object({
  status: z.enum(["oembed", "link", "none"]),
  platform: z.enum(["tiktok", "instagram", "youtube"]).nullable(),
  url: z.string().nullable(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});
export type VideoSource = z.infer<typeof videoSourceSchema>;

export const NO_VIDEO_SOURCE: VideoSource = {
  status: "none",
  platform: null,
  url: null,
  title: null,
  author: null,
  thumbnailUrl: null,
};

/** Le format demandé au modèle (la source est ajoutée ensuite par le serveur). */
export const blueprintModelSchema = z.object({
  title: z.string().describe("Titre de travail de la vidéo à tourner."),
  viralScore: z
    .number()
    .describe("Potentiel viral estimé de ce format adapté à la niche, de 0 à 100."),
  whyItWorks: z
    .string()
    .describe("Pourquoi ce format retient, en deux ou trois phrases : les mécanismes psychologiques en jeu."),
  triggers: z
    .array(z.string())
    .describe("3 à 5 déclencheurs psychologiques, en quelques mots chacun (ex. « boucle de curiosité »)."),
  timeline: z
    .array(
      z.object({
        time: z.string().describe("Plage de temps, ex. « 0-3 s »."),
        phase: z.string().describe("Nom de l'étape : Hook, Rétention, Valeur, Appel à l'action…"),
        spoken: z.string().describe("Ce qui est dit pendant cette étape, mot pour mot."),
        visual: z.string().describe("Ce qu'on voit à l'écran : cadrage, texte incrusté, geste."),
        editing: z.string().describe("Montage de l'étape : coupes, zooms, effets sonores, musique."),
      }),
    )
    .describe("4 à 6 étapes consécutives couvrant toute la vidéo, du hook à l'appel à l'action."),
  script: z
    .string()
    .describe("Le script complet prêt à tourner : les textes dits de chaque étape, mis bout à bout."),
});

export const blueprintOutputSchema = blueprintModelSchema.extend({ source: videoSourceSchema });

export const BLUEPRINT_MIN_STEPS = 3;

export type CloneOutput = z.infer<typeof cloneOutputSchema>;
export type AntiDropoffOutput = z.infer<typeof antiDropoffOutputSchema>;
export type SeriesOutput = z.infer<typeof seriesOutputSchema>;
export type HooksOutput = z.infer<typeof hooksOutputSchema>;
export type BlueprintModelOutput = z.infer<typeof blueprintModelSchema>;
export type BlueprintOutput = z.infer<typeof blueprintOutputSchema>;

export type ToolInputs = {
  clone: CloneInput;
  antidropoff: AntiDropoffInput;
  series: SeriesInput;
  hooks: HooksInput;
  blueprint: BlueprintInput;
};

export type ToolOutputs = {
  clone: CloneOutput;
  antidropoff: AntiDropoffOutput;
  series: SeriesOutput;
  hooks: HooksOutput;
  blueprint: BlueprintOutput;
};

/** Ce que le modèle renvoie, avant les ajouts du serveur (la source du Blueprint). */
export type ToolModelOutputs = Omit<ToolOutputs, "blueprint"> & { blueprint: BlueprintModelOutput };

/** Données préparées par le serveur avant la génération. */
export type GenerationContext = {
  video?: VideoSource;
  /** Texte fourni par le créateur : les chiffres absents de ce texte sont masqués. */
  sourceText?: string;
};

export const TOOL_OUTPUT_SCHEMAS = {
  clone: cloneOutputSchema,
  antidropoff: antiDropoffOutputSchema,
  series: seriesOutputSchema,
  hooks: hooksOutputSchema,
  blueprint: blueprintOutputSchema,
} as const;

export const TOOL_INPUT_SCHEMAS = {
  clone: cloneInputSchema,
  antidropoff: antiDropoffInputSchema,
  series: seriesInputSchema,
  hooks: hooksInputSchema,
  blueprint: blueprintInputSchema,
} as const;
