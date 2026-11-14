/**
 * Chiffres inventés : une réécriture ne doit pas ajouter de montant, de durée ou
 * de statistique que le créateur n'a pas donnés. Chaque nombre absent du texte
 * d'origine devient « [X] », un emplacement à compléter avec ses vrais chiffres.
 */

// « 3 000 », « 1.500 », « 12,5 », « 200 » ; pas « 1er » ni « 24h » (collés à des lettres).
const NUMBER = /\d{1,3}(?:[   .]\d{3})+(?:,\d+)?(?![\p{L}\d])|\d+(?:[.,]\d+)?(?![\p{L}\d])/gu;

const key = (raw: string) => raw.replace(/[   .]/g, "").replace(",", ".");

/** Nombres que l'on peut toujours écrire sans rien affirmer. */
const HARMLESS = new Set(["0", "1", "2"]);

export const FIGURE_PLACEHOLDER = "[X]";

export function maskInventedNumbers(text: string, source: string): string {
  const known = new Set((source.match(NUMBER) ?? []).map(key));
  return text.replace(NUMBER, (raw) => (known.has(key(raw)) || HARMLESS.has(key(raw)) ? raw : FIGURE_PLACEHOLDER));
}
