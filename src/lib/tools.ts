import { z } from "zod";

/**
 * Contrat des trois outils : métadonnées, schémas d'entrée (validation de la
 * requête) et schémas de sortie (format JSON imposé à Claude).
 * Fichier isomorphe : importé par l'API comme par les composants client.
 */

export const TOOL_IDS = ["clone", "antidropoff", "series"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

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

export const generateRequestSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("clone"), input: cloneInputSchema }),
  z.object({ tool: z.literal("antidropoff"), input: antiDropoffInputSchema }),
  z.object({ tool: z.literal("series"), input: seriesInputSchema }),
]);

export type CloneInput = z.infer<typeof cloneInputSchema>;
export type AntiDropoffInput = z.infer<typeof antiDropoffInputSchema>;
export type SeriesInput = z.infer<typeof seriesInputSchema>;
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

export type CloneOutput = z.infer<typeof cloneOutputSchema>;
export type AntiDropoffOutput = z.infer<typeof antiDropoffOutputSchema>;
export type SeriesOutput = z.infer<typeof seriesOutputSchema>;

export type ToolInputs = {
  clone: CloneInput;
  antidropoff: AntiDropoffInput;
  series: SeriesInput;
};

export type ToolOutputs = {
  clone: CloneOutput;
  antidropoff: AntiDropoffOutput;
  series: SeriesOutput;
};

export const TOOL_OUTPUT_SCHEMAS = {
  clone: cloneOutputSchema,
  antidropoff: antiDropoffOutputSchema,
  series: seriesOutputSchema,
} as const;

export const TOOL_INPUT_SCHEMAS = {
  clone: cloneInputSchema,
  antidropoff: antiDropoffInputSchema,
  series: seriesInputSchema,
} as const;
