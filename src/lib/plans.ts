import type { Plan } from "@/types/database";

/** Crédits offerts à l'inscription. Doit rester aligné sur le DEFAULT de `credits.balance`. */
export const FREE_CREDITS = 3;

export const PRO_PRICE = process.env.NEXT_PUBLIC_PRO_PRICE ?? "19 €";

/**
 * Lien de paiement du plan Pro (page de paiement Whop). Tous les boutons
 * « Passer en Pro » du site y mènent.
 * Pour en changer sans toucher au code : variable NEXT_PUBLIC_CHECKOUT_URL.
 */
export const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://whop.com/checkout/plan_CPkJSKD2HKOZP";

export function isPro(plan: Plan): boolean {
  return plan === "pro";
}

/**
 * Lien de paiement pour un utilisateur connecté.
 *
 * Whop (et tout autre fournisseur) : le lien est utilisé tel quel.
 * LemonSqueezy : on pré-remplit l'e-mail et on transmet l'identifiant du
 * compte en `custom_data`, que le webhook relit pour activer le bon profil.
 */
export function getCheckoutUrl(user: { id: string; email: string }): string {
  let url: URL;
  try {
    url = new URL(CHECKOUT_URL);
  } catch {
    return CHECKOUT_URL;
  }

  if (!url.hostname.endsWith("lemonsqueezy.com")) return CHECKOUT_URL;

  url.searchParams.set("checkout[email]", user.email);
  url.searchParams.set("checkout[custom][user_id]", user.id);
  return url.toString();
}
