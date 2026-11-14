/**
 * Courbe de rétention prédite : pour chaque phrase d'un script, un risque de
 * décrochage, et la part estimée des spectateurs encore là, seconde par
 * seconde. Calcul instantané, dans le navigateur, sur la forme du texte :
 * c'est une estimation, pas une donnée de la plateforme.
 */

import {
  countTerms,
  CTA_WORDS,
  CURIOSITY_WORDS,
  DIRECT_ADDRESS,
  FILLERS,
  IMPERATIVE_OPENERS,
  normalize,
  OPEN_LOOPS,
  SLOW_OPENERS,
  splitSentences,
  splitWords,
} from "@/lib/viral-score";

export type RiskLevel = "ok" | "warn" | "drop";

export type SentenceRisk = {
  text: string;
  /** Début et fin à l'oral, en secondes. */
  start: number;
  end: number;
  /** Risque de décrochage, de 0 (accroche) à 100 (on swipe). */
  risk: number;
  level: RiskLevel;
  /** Ce qui fait monter (ou baisser) le risque, en une phrase. Null si rien à signaler. */
  reason: string | null;
};

export type RetentionPoint = { second: number; retention: number };

export type RetentionAnalysis = {
  sentences: SentenceRisk[];
  /** Un point par seconde, de 0 à la fin. */
  curve: RetentionPoint[];
  durationSeconds: number;
  /** Part estimée des spectateurs encore là à la fin, en %. */
  finalRetention: number;
  /** Rétention moyenne sur toute la vidéo, en %. */
  averageRetention: number;
};

export const RETENTION_MIN_WORDS = 8;

/** Débit face caméra : environ 150 mots par minute. */
const WORDS_PER_SECOND = 150 / 60;

const TRANSITION_OPENERS = ["alors", "donc", "ensuite", "en fait", "bref", "du coup", "voila", "so ", "then", "anyway"];
const FLAT_ENDINGS = ["voila", "c'est tout", "en gros", "c'est ca", "that's it", "that's all"];
const GENERIC_CTA = ["abonne", "abonnez", "n'oublie", "n'oubliez", "like", "pouce bleu", "subscribe", "smash"];

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function levelFor(risk: number): RiskLevel {
  if (risk >= 60) return "drop";
  if (risk >= 35) return "warn";
  return "ok";
}

/** Risque d'une phrase selon sa place dans le script. */
function sentenceRisk(sentence: string, index: number, count: number): { risk: number; reason: string | null } {
  const normalized = normalize(sentence);
  const words = splitWords(normalized);
  const isFirst = index === 0;
  const isLast = index === count - 1 && count > 1;
  const isNearEnd = count > 2 && index >= count - 2;

  // Chaque facteur : points ajoutés au risque, et la raison affichée s'il domine.
  const factors: { points: number; reason: string }[] = [];
  const add = (points: number, reason: string) => factors.push({ points, reason });

  if (index <= 1 && SLOW_OPENERS.some((opener) => normalized.startsWith(opener))) {
    add(isFirst ? 55 : 30, "Formule d'accueil ou d'annonce : la vidéo n'a pas encore commencé.");
  }
  if (words.length > 22) add(25, `Phrase de ${words.length} mots : trop longue à suivre à l'oral.`);
  else if (words.length > 15) add(10, `Phrase de ${words.length} mots : raccourcis-la.`);

  const fillers = countTerms(normalized, FILLERS);
  if (fillers > 0) add(Math.min(fillers, 3) * 12, `${fillers} mot${fillers > 1 ? "s" : ""} de remplissage (« en fait », « du coup »…).`);

  if (!isFirst && TRANSITION_OPENERS.some((opener) => normalized.startsWith(opener))) {
    add(10, "Transition molle : entre directement dans l'idée.");
  }
  if ((isLast || isNearEnd) && FLAT_ENDINGS.some((ending) => normalized.includes(ending))) {
    add(25, "Fin plate : rien ne donne envie d'agir ou de revenir.");
  }
  if (isLast && countTerms(normalized, GENERIC_CTA) > 0 && !sentence.includes("?")) {
    add(20, "Appel à l'action générique : donne une raison précise de commenter.");
  }

  // Ce qui retient : curiosité, question, chiffre, adresse directe.
  const curiosity = countTerms(normalized, CURIOSITY_WORDS) + countTerms(normalized, OPEN_LOOPS);
  const hasQuestion = sentence.includes("?");
  const hasNumber = /\d/.test(sentence);
  const addressesViewer = words.some((word) => DIRECT_ADDRESS.has(word)) || IMPERATIVE_OPENERS.has(words[0] ?? "");
  let bonus = Math.min(curiosity, 2) * 10 + (hasQuestion ? 8 : 0) + (hasNumber ? 5 : 0) + (addressesViewer ? 6 : 0);
  if (isFirst && (hasQuestion || hasNumber || addressesViewer || curiosity > 0)) bonus += 10;
  if (isLast && countTerms(normalized, CTA_WORDS) > 0 && hasQuestion) bonus += 10;

  const total = 22 + factors.reduce((sum, factor) => sum + factor.points, 0) - bonus;
  const risk = clamp(Math.round(total));
  const main = factors.sort((a, b) => b.points - a.points)[0];
  return { risk, reason: risk >= 35 && main ? main.reason : null };
}

/**
 * Analyse un script. Renvoie null s'il compte moins de RETENTION_MIN_WORDS mots.
 *
 * Modèle de la courbe : une chute initiale qui dépend du hook (les deux
 * premières secondes), puis une érosion continue dont la pente suit le risque
 * de la phrase en cours. Bornes réalistes pour une vidéo courte.
 */
export function analyzeRetention(text: string): RetentionAnalysis | null {
  const sentencesText = splitSentences(text);
  const totalWords = splitWords(text).length;
  if (totalWords < RETENTION_MIN_WORDS || sentencesText.length === 0) return null;

  let cursor = 0;
  const sentences: SentenceRisk[] = sentencesText.map((sentenceText, index) => {
    const duration = Math.max(0.8, splitWords(sentenceText).length / WORDS_PER_SECOND);
    const { risk, reason } = sentenceRisk(sentenceText, index, sentencesText.length);
    const sentence = { text: sentenceText, start: cursor, end: cursor + duration, risk, level: levelFor(risk), reason };
    cursor += duration;
    return sentence;
  });

  const durationSeconds = Math.max(1, Math.ceil(cursor));
  const hookRisk = sentences[0].risk;
  // Chute des deux premières secondes : de 12 % (hook fort) à 45 % (hook raté).
  const initialDrop = 12 + (hookRisk / 100) * 33;

  const curve: RetentionPoint[] = [{ second: 0, retention: 100 }];
  let retention = 100;
  for (let second = 1; second <= durationSeconds; second++) {
    if (second <= 2) {
      retention -= initialDrop / 2;
    } else {
      const current = sentences.find((sentence) => second - 0.5 < sentence.end) ?? sentences[sentences.length - 1];
      // Érosion par seconde : 0,4 % (phrase qui accroche) à 4 % (phrase qui fait fuir).
      retention -= 0.4 + (current.risk / 100) * 3.6;
    }
    retention = clamp(retention, 3);
    curve.push({ second, retention: Math.round(retention * 10) / 10 });
  }

  const averageRetention = curve.reduce((sum, point) => sum + point.retention, 0) / curve.length;
  return {
    sentences,
    curve,
    durationSeconds,
    finalRetention: Math.round(curve[curve.length - 1].retention),
    averageRetention: Math.round(averageRetention),
  };
}
