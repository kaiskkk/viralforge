import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { WHOP_PLAN_ID } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Webhook Whop : passe un compte en "pro" après paiement, puis le repasse en
 * "free" quand l'abonnement prend fin.
 *
 * Configuration (Whop → Developer → Webhooks → Create webhook) :
 *   URL      https://ton-domaine.com/api/webhooks/whop
 *   Version  v1
 *   Events   payment.succeeded, membership.activated, membership.deactivated
 *   Secret   à copier dans WHOP_WEBHOOK_SECRET (commence par ws_)
 *
 * Le compte est retrouvé par l'e-mail utilisé au paiement. S'il n'existe pas
 * encore, le plan Pro est mis en attente (table pending_upgrades) et appliqué
 * à la création du compte.
 */

const PROVIDER = "whop";

// Whop signe selon la spécification Standard Webhooks.
const TOLERANCE_SECONDS = 5 * 60;

const ACTIVATING_EVENTS = new Set(["payment.succeeded", "membership.activated"]);
const DEACTIVATING_EVENTS = new Set(["membership.deactivated"]);

const reference = z.object({ id: z.string().nullish() }).nullish();

// Les champs utiles existent sous deux formes selon la version de l'API
// choisie pour le webhook : à plat (customer_email, user_id, membership_id,
// variant_id) ou imbriqués (user.email, user.id, membership.id, plan.id).
const payloadSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string().nullish(),
    customer_email: z.string().nullish(),
    user_id: z.string().nullish(),
    membership_id: z.string().nullish(),
    variant_id: z.string().nullish(),
    user: z.object({ id: z.string().nullish(), email: z.string().nullish() }).nullish(),
    membership: reference,
    plan: reference,
  }),
});

/**
 * Signature attendue : HMAC-SHA256 de `{webhook-id}.{webhook-timestamp}.{corps}`,
 * en base64, avec le secret `ws_…` utilisé tel quel comme clé. L'en-tête
 * `webhook-signature` peut porter plusieurs signatures `v1,<base64>`.
 */
function isValidSignature(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;

  // Un message trop ancien (ou daté du futur) est un rejeu : refusé.
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const received = Buffer.from(value, "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[webhook whop] WHOP_WEBHOOK_SECRET n'est pas définie");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  // La signature porte sur le corps brut : le lire en texte avant tout parsing.
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps illisible" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Format inattendu" }, { status: 400 });
  }

  const { type, data } = parsed.data;
  const activating = ACTIVATING_EVENTS.has(type);
  if (!activating && !DEACTIVATING_EVENTS.has(type)) {
    return NextResponse.json({ received: true, ignored: type });
  }

  // Le compte Whop peut vendre autre chose : seul le plan du site compte.
  const planId = data.variant_id ?? data.plan?.id ?? null;
  if (WHOP_PLAN_ID && planId && planId !== WHOP_PLAN_ID) {
    return NextResponse.json({ received: true, ignored: "other_plan" });
  }

  const isMembershipEvent = type.startsWith("membership.");
  const subscription: Subscription = {
    // Supabase Auth stocke les e-mails en minuscules.
    email: (data.customer_email ?? data.user?.email)?.trim().toLowerCase() || null,
    customerId: data.user_id ?? data.user?.id ?? null,
    membershipId: (isMembershipEvent ? data.id : (data.membership_id ?? data.membership?.id)) ?? null,
  };

  try {
    const result = activating ? await activate(subscription) : await deactivate(subscription);
    if (!result.matched) {
      console.warn(`[webhook whop] ${type} : aucun compte correspondant`, {
        hasEmail: Boolean(subscription.email),
        membershipId: subscription.membershipId,
      });
    }
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    // Réponse 500 : Whop relivrera l'événement.
    console.error(`[webhook whop] ${type} : mise à jour impossible`, error);
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
}

type Subscription = {
  email: string | null;
  customerId: string | null;
  membershipId: string | null;
};

type Outcome = { matched: boolean; plan: "pro" | "free"; pending?: boolean };

/**
 * Vrai tant que la migration 0002 n'a pas été exécutée. Les plans en attente
 * sont alors indisponibles, sans bloquer le reste : répondre 500 ferait
 * relivrer l'événement en boucle.
 */
function isMissingTable(error: { code?: string }): boolean {
  const missing = error.code === "PGRST205" || error.code === "42P01";
  if (missing) {
    console.warn("[webhook whop] table pending_upgrades absente : exécute la migration 0002");
  }
  return missing;
}

async function activate({ email, customerId, membershipId }: Subscription): Promise<Outcome> {
  const admin = createAdminClient();
  const upgrade = {
    plan: "pro" as const,
    billing_provider: PROVIDER,
    billing_customer_id: customerId,
    billing_subscription_id: membershipId,
    updated_at: new Date().toISOString(),
  };

  if (email) {
    const { data, error } = await admin.from("users").update(upgrade).eq("email", email).select("id");
    if (error) throw error;
    if (data.length > 0) return { matched: true, plan: "pro" };
  }

  // Événement sans e-mail : le compte a pu être relié par un événement précédent.
  if (membershipId) {
    const { data, error } = await admin
      .from("users")
      .update({ plan: "pro", updated_at: upgrade.updated_at })
      .eq("billing_provider", PROVIDER)
      .eq("billing_subscription_id", membershipId)
      .select("id");
    if (error) throw error;
    if (data.length > 0) return { matched: true, plan: "pro" };
  }

  // Paiement avant inscription : le plan attend la création du compte.
  if (email) {
    const { error } = await admin.from("pending_upgrades").upsert({
      email,
      billing_provider: PROVIDER,
      billing_customer_id: customerId,
      billing_subscription_id: membershipId,
    });
    if (error && !isMissingTable(error)) throw error;
    return { matched: false, plan: "pro", pending: !error };
  }

  return { matched: false, plan: "pro" };
}

async function deactivate({ customerId, membershipId }: Subscription): Promise<Outcome> {
  const admin = createAdminClient();
  const downgrade = { plan: "free" as const, updated_at: new Date().toISOString() };

  if (membershipId) {
    // Un plan encore en attente pour cet abonnement n'a plus lieu d'être.
    const { error: pendingError } = await admin
      .from("pending_upgrades")
      .delete()
      .eq("billing_subscription_id", membershipId);
    if (pendingError && !isMissingTable(pendingError)) throw pendingError;

    const { data, error } = await admin
      .from("users")
      .update(downgrade)
      .eq("billing_provider", PROVIDER)
      .eq("billing_subscription_id", membershipId)
      .select("id");
    if (error) throw error;
    if (data.length > 0) return { matched: true, plan: "free" };
  }

  // Compte activé par un paiement sans abonnement connu : repli sur le client Whop.
  if (customerId) {
    const { data, error } = await admin
      .from("users")
      .update(downgrade)
      .eq("billing_provider", PROVIDER)
      .eq("billing_customer_id", customerId)
      .is("billing_subscription_id", null)
      .select("id");
    if (error) throw error;
    if (data.length > 0) return { matched: true, plan: "free" };
  }

  return { matched: false, plan: "free" };
}
