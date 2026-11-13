/**
 * Moteur du simulateur de score viral (page d'accueil).
 *
 * Analyse purement algorithmique, exécutée dans le navigateur : instantanée,
 * gratuite, sans appel d'API. Elle mesure cinq signaux connus de la rétention
 * en vidéo courte. C'est une estimation de la forme du script, pas une
 * prédiction de vues ; l'analyse fine par IA est le rôle de l'outil Anti-Dropoff.
 *
 * Fonctionne sur des scripts en français et en anglais.
 */

export type CriterionKey = "hook" | "rhythm" | "tension" | "clarity" | "ending";

export type Criterion = {
  key: CriterionKey;
  label: string;
  /** 0 à 100 */
  score: number;
  /** Ce que l'analyse a constaté, en une phrase. */
  insight: string;
};

export type ViralScore = {
  /** 0 à 100 */
  total: number;
  verdict: string;
  criteria: Criterion[];
  /** Jusqu'à trois actions prioritaires, les plus rentables d'abord. */
  tips: string[];
  stats: { words: number; sentences: number; seconds: number };
};

export const MIN_WORDS = 15;

const WEIGHTS: Record<CriterionKey, number> = {
  hook: 0.3,
  rhythm: 0.2,
  tension: 0.2,
  clarity: 0.15,
  ending: 0.15,
};

// Toutes les listes sont en minuscules et sans accents (voir normalize()).

const SLOW_OPENERS = [
  "bonjour",
  "salut",
  "coucou",
  "hello",
  "bienvenue",
  "aujourd'hui je",
  "aujourd'hui on",
  "aujourd'hui nous",
  "dans cette video",
  "dans cette nouvelle video",
  "je m'appelle",
  "moi c'est",
  "hi ",
  "hi,",
  "welcome",
  "today i",
  "today we",
  "in this video",
  "my name is",
  "so today",
];

const DIRECT_ADDRESS = new Set([
  "tu", "te", "toi", "ton", "ta", "tes", "t'es", "t'as",
  "vous", "votre", "vos",
  "you", "your", "you're", "you've",
]);

const CURIOSITY_WORDS = [
  "secret", "erreur", "erreurs", "personne", "jamais", "arrete", "arretez", "stop",
  "pourquoi", "verite", "mensonge", "piege", "interdit", "cache",
  "incroyable", "choquant", "pire", "gratuit", "prouve", "decouvert",
  "ruine", "sauve", "danger", "attention", "vraie raison",
  "mistake", "mistakes", "nobody", "never", "why", "truth", "lie",
  "trap", "hidden", "worst", "proven", "free", "warning",
  "the real reason", "what nobody",
];

const OPEN_LOOPS = [
  "mais", "sauf que", "pourtant", "et la", "le probleme", "le truc", "resultat",
  "jusqu'a", "jusqu'au jour", "ce que j'ai", "voici", "la suite", "attends",
  "en realite", "contrairement", "au lieu de", "imagine",
  "but", "until", "except", "here's the thing", "the problem", "turns out",
  "instead", "wait", "here's why", "here's what", "imagine",
];

const FILLERS = [
  "en fait", "du coup", "genre", "voila", "bah", "euh", "un peu", "vraiment",
  "je pense que", "je crois que", "en quelque sorte", "pas forcement", "plus ou moins",
  "assez", "j'espere que",
  "basically", "actually", "literally", "kind of", "sort of", "i think",
  "i guess", "you know", "really", "very", "just",
];

/** Un impératif en ouverture interpelle le spectateur aussi sûrement qu'un « tu ». */
const IMPERATIVE_OPENERS = new Set([
  "stop", "arrete", "arretez", "regarde", "regardez", "ecoute", "ecoutez",
  "imagine", "imaginez", "oublie", "oubliez", "ne", "n'",
  "don't", "never", "look", "listen", "forget", "quit",
]);

const CTA_WORDS = [
  "abonne", "abonnez", "commente", "commentez", "partage", "partagez",
  "enregistre", "enregistrez", "sauvegarde", "sauvegardez", "like",
  "lien", "dis-moi", "dis moi", "dites-moi", "ecris", "ecrivez", "envoie", "envoyez",
  "teste", "testez", "essaie", "essayez",
  "follow", "subscribe", "comment", "share", "save", "link", "tell me", "try",
];

const CLIFFHANGER_WORDS = [
  "demain", "partie 2", "partie deux", "la suite", "prochaine video", "prochain episode",
  "tomorrow", "part 2", "part two", "next video", "next episode",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'");
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?…\n]+[.!?…]*/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));
}

function splitWords(text: string): string[] {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
}

/** Nombre d'occurrences des expressions de `terms`, en respectant les limites de mots. */
function countTerms(normalized: string, terms: string[]): number {
  let count = 0;
  for (const term of terms) {
    const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Pas de lookbehind : absent des anciens Safari.
    const matches = normalized.match(new RegExp(`(?:^|[^a-z0-9])${escaped}(?![a-z0-9])`, "g"));
    count += matches?.length ?? 0;
  }
  return count;
}

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

function scoreHook(sentences: string[]): Criterion & { tip: string } {
  // Une première phrase très courte ("Stop.") forme le hook avec la suivante.
  let hook = sentences[0] ?? "";
  if (splitWords(hook).length < 4 && sentences[1]) hook = `${hook} ${sentences[1]}`;

  const normalized = normalize(hook);
  const words = splitWords(normalized);
  const slowOpener = SLOW_OPENERS.some((opener) => normalized.startsWith(opener));
  const hasQuestion = hook.includes("?");
  const hasNumber = /\d/.test(hook);
  const addressesViewer =
    words.some((word) => DIRECT_ADDRESS.has(word)) || IMPERATIVE_OPENERS.has(words[0] ?? "");
  const curiosity = countTerms(normalized, CURIOSITY_WORDS);

  let score = 35;
  if (words.length <= 12) score += 15;
  else if (words.length <= 18) score += 6;
  else if (words.length > 25) score -= 12;
  if (hasQuestion) score += 12;
  if (hasNumber) score += 10;
  if (addressesViewer) score += 13;
  score += Math.min(curiosity, 3) * 9;
  if (slowOpener) score -= 30;

  let insight: string;
  let tip: string;
  if (slowOpener) {
    insight = "Le script démarre par une formule d'introduction : la première seconde est perdue.";
    tip = "Supprime l'introduction et ouvre directement sur ta phrase la plus forte.";
  } else if (words.length > 18) {
    insight = `La première phrase fait ${words.length} mots : trop longue pour arrêter un pouce.`;
    tip = "Raccourcis ta première phrase à 12 mots maximum.";
  } else if (!addressesViewer && !hasQuestion) {
    insight = "L'ouverture ne s'adresse pas au spectateur et ne pose aucune question.";
    tip = "Parle au spectateur dès la première phrase : « tu », une question, un problème qu'il reconnaît.";
  } else if (curiosity === 0 && !hasNumber) {
    insight = "L'ouverture est claire mais n'ouvre aucune boucle de curiosité.";
    tip = "Ajoute une tension dans le hook : un chiffre, une erreur à éviter, une promesse précise.";
  } else {
    insight = "L'ouverture est courte, directe et donne une raison de rester.";
    tip = "";
  }

  return { key: "hook", label: "Hook", score: clamp(score), insight, tip };
}

function scoreRhythm(sentences: string[]): Criterion & { tip: string } {
  const lengths = sentences.map((sentence) => splitWords(sentence).length);
  const average = lengths.reduce((sum, length) => sum + length, 0) / Math.max(lengths.length, 1);
  const longRatio = lengths.filter((length) => length > 22).length / Math.max(lengths.length, 1);
  const hasPunch = lengths.some((length) => length <= 4);
  const variance =
    lengths.reduce((sum, length) => sum + (length - average) ** 2, 0) / Math.max(lengths.length, 1);

  let score: number;
  if (average <= 10) score = 82;
  else if (average <= 14) score = 70;
  else if (average <= 18) score = 52;
  else if (average <= 24) score = 34;
  else score = 18;

  score -= longRatio * 30;
  if (hasPunch) score += 8;
  if (Math.sqrt(variance) >= 3) score += 8;
  if (sentences.length < 3) score = Math.min(score, 45);

  let insight: string;
  let tip: string;
  if (sentences.length < 3) {
    insight = "Le texte tient en une ou deux phrases : il n'a pas encore de rythme.";
    tip = "Découpe ton texte en phrases courtes, une idée par phrase.";
  } else if (average > 18) {
    insight = `Tes phrases font ${Math.round(average)} mots en moyenne : difficile à suivre à l'oral.`;
    tip = "Coupe tes longues phrases en deux : vise 8 à 12 mots par phrase.";
  } else if (longRatio > 0.2) {
    insight = "Plusieurs phrases dépassent 22 mots et cassent le rythme.";
    tip = "Repère tes phrases de plus de 22 mots et scinde-les.";
  } else if (!hasPunch) {
    insight = "Le rythme est régulier, sans phrase très courte pour créer un impact.";
    tip = "Glisse une phrase choc de 2 à 4 mots après une idée forte.";
  } else {
    insight = "Phrases courtes et longueurs variées : le rythme tient.";
    tip = "";
  }

  return { key: "rhythm", label: "Rythme", score: clamp(score), insight, tip };
}

function scoreTension(text: string, wordCount: number): Criterion & { tip: string } {
  const normalized = normalize(text);
  const curiosity = countTerms(normalized, CURIOSITY_WORDS);
  const loops = countTerms(normalized, OPEN_LOOPS);
  const questions = (text.match(/\?/g) ?? []).length;
  const density = ((curiosity + loops * 1.5 + questions) / Math.max(wordCount, 1)) * 100;

  const score = 22 + density * 9;

  let insight: string;
  let tip: string;
  if (loops === 0) {
    insight = "Aucun retournement détecté : le script expose, mais ne crée pas d'attente.";
    tip = "Crée une attente : annonce ce qui arrive (« mais », « sauf que », « voici pourquoi ») avant de le donner.";
  } else if (density < 4) {
    insight = "Peu de tension au fil du texte : la curiosité retombe après l'ouverture.";
    tip = "Relance la curiosité toutes les deux ou trois phrases avec une question ou un contraste.";
  } else {
    insight = "Le script entretient la curiosité avec des contrastes et des relances.";
    tip = "";
  }

  return { key: "tension", label: "Tension", score: clamp(score), insight, tip };
}

function scoreClarity(text: string, words: string[]): Criterion & { tip: string } {
  const normalized = normalize(text);
  const numbers = (text.match(/\d+/g) ?? []).length;
  const fillers = countTerms(normalized, FILLERS);
  const fillerDensity = (fillers / Math.max(words.length, 1)) * 100;
  const averageWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1);

  let score = 62;
  score += Math.min(numbers, 3) * 8;
  score -= Math.min(fillerDensity * 9, 45);
  if (averageWordLength > 6.2) score -= 10;

  let insight: string;
  let tip: string;
  if (fillerDensity >= 2) {
    insight = `${fillers} mots de remplissage détectés (« en fait », « du coup », « vraiment »…).`;
    tip = "Supprime les mots de remplissage : chaque mot doit faire avancer l'idée.";
  } else if (numbers === 0) {
    insight = "Aucun chiffre ni repère concret : le propos reste abstrait.";
    tip = "Ajoute un élément concret et vérifiable : un chiffre, une durée, un exemple précis.";
  } else if (averageWordLength > 6.2) {
    insight = "Vocabulaire dense : beaucoup de mots longs pour un texte dit à voix haute.";
    tip = "Remplace les mots longs ou techniques par leur équivalent parlé.";
  } else {
    insight = "Propos concret, sans mots parasites.";
    tip = "";
  }

  return { key: "clarity", label: "Clarté", score: clamp(score), insight, tip };
}

function scoreEnding(sentences: string[]): Criterion & { tip: string } {
  const ending = sentences.slice(-2).join(" ");
  const normalized = normalize(ending);
  const hasCta = countTerms(normalized, CTA_WORDS) > 0;
  const hasCliffhanger = countTerms(normalized, CLIFFHANGER_WORDS) > 0;
  const endsOnQuestion = ending.includes("?");

  let score = 25;
  if (hasCta) score += 40;
  if (hasCliffhanger) score += 30;
  if (endsOnQuestion) score += 18;

  let insight: string;
  let tip: string;
  if (hasCta || hasCliffhanger) {
    insight = "La fin donne une action à faire ou une raison de revenir.";
    tip = "";
  } else if (endsOnQuestion) {
    insight = "La fin pose une question, mais sans appel à l'action explicite.";
    tip = "Termine par une action précise : commenter un mot, enregistrer, voir la suite.";
  } else {
    insight = "Le script s'arrête sans appel à l'action ni ouverture.";
    tip = "Ajoute une dernière phrase qui dit quoi faire : s'abonner pour la suite, commenter, enregistrer.";
  }

  return { key: "ending", label: "Chute", score: clamp(score), insight, tip };
}

function verdictFor(total: number): string {
  if (total >= 80) return "Fort potentiel de rétention";
  if (total >= 60) return "Solide, encore perfectible";
  if (total >= 40) return "Risque de décrochage";
  return "À retravailler";
}

/** Calcule le score viral d'un script. Renvoie null si le texte est trop court. */
export function scoreScript(text: string): ViralScore | null {
  const words = splitWords(text);
  if (words.length < MIN_WORDS) return null;

  const sentences = splitSentences(text);
  const scored = [
    scoreHook(sentences),
    scoreRhythm(sentences),
    scoreTension(text, words.length),
    scoreClarity(text, words),
    scoreEnding(sentences),
  ];

  let total = scored.reduce((sum, criterion) => sum + criterion.score * WEIGHTS[criterion.key], 0);

  const tips = scored
    .filter((criterion) => criterion.tip)
    // Gain potentiel décroissant : points manquants × poids du critère.
    .sort((a, b) => (100 - b.score) * WEIGHTS[b.key] - (100 - a.score) * WEIGHTS[a.key])
    .map((criterion) => criterion.tip);

  // Format court : hors de la plage 40–220 mots, la rétention devient plus difficile.
  if (words.length > 260) {
    total -= 8;
    tips.unshift("Ton script dépasse 1 min 40 à l'oral : coupe pour tenir sous 220 mots.");
  } else if (words.length < 40) {
    total -= 6;
  }

  return {
    total: clamp(total),
    verdict: verdictFor(clamp(total)),
    criteria: scored.map(({ key, label, score, insight }) => ({ key, label, score, insight })),
    tips: tips.slice(0, 3),
    stats: {
      words: words.length,
      sentences: sentences.length,
      // Débit moyen face caméra : environ 150 mots par minute.
      seconds: Math.round((words.length / 150) * 60),
    },
  };
}
