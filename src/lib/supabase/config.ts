/**
 * Réglages publics du projet Supabase.
 *
 * L'URL et la clé « publishable » sont conçues pour être visibles dans le
 * navigateur : elles peuvent vivre dans le code. Les variables d'environnement
 * gardent la priorité, ce qui permet de viser un autre projet (ou une instance
 * locale) sans toucher au code.
 *
 * La clé secrète (SUPABASE_SERVICE_ROLE_KEY) n'a pas sa place ici : elle reste
 * une variable d'environnement côté serveur.
 */
const DEFAULT_SUPABASE_URL = "https://pnurnrdhcanoecueyziv.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UNXAYuv4Sguf3ZolUaIezA_3S8Hgiy5";

// Clé « publishable » (sb_publishable_…) ou ancienne clé anon (JWT).
const PUBLIC_KEY_PATTERN = /^(sb_publishable_[\w-]{8,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/;

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Une variable mal renseignée (son propre nom collé comme valeur, texte
 * tronqué…) est ignorée au profit du réglage par défaut : sans cela, Supabase
 * répond « Invalid API key » et plus personne ne peut se connecter.
 */
function pick(name: string, isValid: (value: string) => boolean, fallback: string, raw?: string) {
  const value = raw?.trim();
  if (!value) return fallback;
  if (isValid(value)) return value;

  if (typeof window === "undefined") {
    console.warn(`[supabase] ${name} est mal renseignée : valeur par défaut utilisée.`);
  }
  return fallback;
}

export const SUPABASE_URL = pick(
  "NEXT_PUBLIC_SUPABASE_URL",
  isHttpUrl,
  DEFAULT_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = pick(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  (value) => PUBLIC_KEY_PATTERN.test(value),
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Faux seulement si les réglages par défaut ci-dessus sont vidés. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
