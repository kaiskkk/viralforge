/**
 * Passage d'un brouillon d'un outil à l'autre (ex. Courbe de rétention →
 * Anti-Dropoff). Le texte voyage dans le sessionStorage de l'onglet et n'est
 * lu qu'une fois : rien n'est envoyé au serveur.
 */

export type DraftTarget = "antidropoff" | "retention";

const key = (target: DraftTarget) => `viralforge:draft:${target}`;

export function sendDraft(target: DraftTarget, text: string): void {
  try {
    sessionStorage.setItem(key(target), text);
  } catch {
    // Stockage indisponible : l'outil s'ouvrira vide.
  }
}

export function takeDraft(target: DraftTarget): string | null {
  try {
    const text = sessionStorage.getItem(key(target));
    sessionStorage.removeItem(key(target));
    return text;
  } catch {
    return null;
  }
}

/** Étapes de démarrage franchies sur cet appareil (checklist du dashboard). */
export type LocalMilestone = "retention";

export function markMilestone(milestone: LocalMilestone): void {
  try {
    localStorage.setItem(`viralforge:done:${milestone}`, "1");
  } catch {
    // Sans stockage, la checklist ne cochera pas cette étape : sans gravité.
  }
}

export function hasMilestone(milestone: LocalMilestone): boolean {
  try {
    return localStorage.getItem(`viralforge:done:${milestone}`) === "1";
  } catch {
    return false;
  }
}
