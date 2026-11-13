import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types/database";

export const runtime = "nodejs";

/**
 * Webhook LemonSqueezy : fait passer un compte en "pro" ou le repasse en "free".
 *
 * Configuration (LemonSqueezy → Settings → Webhooks) :
 *   URL      https://ton-domaine.com/api/webhooks/lemonsqueezy
 *   Secret   la valeur de LEMONSQUEEZY_WEBHOOK_SECRET
 *   Events   order_created, order_refunded, subscription_created,
 *            subscription_updated, subscription_cancelled, subscription_resumed,
 *            subscription_expired, subscription_paused, subscription_unpaused
 *
 * Le compte est retrouvé via `custom_data.user_id` (ajouté au lien de paiement
 * par getCheckoutUrl), ou à défaut via l'e-mail saisi au paiement.
 */

const payloadSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.object({ user_id: z.string().optional() }).nullish(),
  }),
  data: z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
      status: z.string().optional(),
      user_email: z.string().optional(),
      customer_id: z.union([z.number(), z.string()]).optional(),
    }),
  }),
});

// "cancelled" = résilié mais encore dans la période payée : l'accès reste ouvert
// jusqu'à l'événement subscription_expired.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["on_trial", "active", "past_due", "cancelled"]);

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Déduit le plan à appliquer, ou null si l'événement ne change rien. */
function resolvePlan(eventName: string, dataType: string, status: string | undefined): Plan | null {
  if (dataType === "subscriptions" && status) {
    return ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? "pro" : "free";
  }
  if (dataType === "orders") {
    if (eventName === "order_created" && status === "paid") return "pro";
    if (eventName === "order_refunded") return "free";
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] LEMONSQUEEZY_WEBHOOK_SECRET n'est pas définie");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  // La signature porte sur le corps brut : le lire en texte avant tout parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";
  if (!isValidSignature(rawBody, signature, secret)) {
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

  const { meta, data } = parsed.data;
  const plan = resolvePlan(meta.event_name, data.type, data.attributes.status);
  if (!plan) {
    return NextResponse.json({ received: true, ignored: meta.event_name });
  }

  const admin = createAdminClient();
  const userId = meta.custom_data?.user_id;
  const email = data.attributes.user_email;

  const update = admin.from("users").update({
    plan,
    billing_provider: "lemonsqueezy",
    billing_customer_id:
      data.attributes.customer_id != null ? String(data.attributes.customer_id) : null,
    billing_subscription_id: data.type === "subscriptions" ? data.id : null,
    updated_at: new Date().toISOString(),
  });

  // Supabase Auth stocke les e-mails en minuscules.
  const filtered = userId
    ? update.eq("id", userId)
    : email
      ? update.eq("email", email.trim().toLowerCase())
      : null;
  if (!filtered) {
    console.warn(`[webhook] ${meta.event_name} sans user_id ni e-mail`);
    return NextResponse.json({ received: true, matched: false });
  }

  const { data: updated, error } = await filtered.select("id");
  if (error) {
    // Réponse 500 : LemonSqueezy relivrera l'événement.
    console.error("[webhook] mise à jour du plan impossible", error);
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }

  if (updated.length === 0) {
    console.warn(`[webhook] ${meta.event_name} : aucun compte pour ${userId ?? email}`);
  }
  return NextResponse.json({ received: true, matched: updated.length > 0, plan });
}
