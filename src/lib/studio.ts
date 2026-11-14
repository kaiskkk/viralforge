/**
 * Passage d'un script vers le Studio (téléprompteur). Le script voyage dans
 * le sessionStorage de l'onglet : rien n'est envoyé au serveur.
 */

const STORAGE_KEY = "viralforge:studio";

export type StudioScript = { title: string; script: string };

export function sendToStudio(entry: StudioScript): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le Studio s'ouvrira vide.
  }
}

export function readStudioScript(): StudioScript | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioScript>;
    return typeof parsed.script === "string"
      ? { title: typeof parsed.title === "string" ? parsed.title : "", script: parsed.script }
      : null;
  } catch {
    return null;
  }
}
