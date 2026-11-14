import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { WHOP_PLAN_ID } from "@/lib/plans";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

/**
 * Webhook Whop : passe un compte en "pro" après paiement, puis le repasse en
 * "free" quand l'abonnement prend fin.
 *
 * Tout le traitement a lieu dans la base, par la fonction handle_whop_webhook
 * (migration 0004) : elle vérifie la signature avec le secret du webhook rangé
 * dans app_secrets, puis met le plan à jour. Le site n'a besoin d'aucune
 * variable d'environnement pour ça.
 *
 * Configuration (Whop → Developer → Webhooks, ou API POST /webhooks) :
 *   URL      https://ton-domaine.com/api/webhooks/whop
 *   Events   payment.succeeded, membership.activated, membership.deactivated
 *   Secret   à enregistrer dans public.app_secrets (voir la migration 0004)
 */

type WebhookResult = {
  status: "not_configured" | "invalid_signature" | "invalid_body" | "ignored" | "ok";
  reason?: string;
  matched?: boolean;
  plan?: "pro" | "free";
  pending?: boolean;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase n'est pas configuré" }, { status: 500 });
  }

  // La signature porte sur le corps brut : il est transmis tel quel.
  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signatures = request.headers.get("webhook-signature");
  if (!webhookId || !timestamp || !signatures) {
    return NextResponse.json({ error: "Signature absente" }, { status: 401 });
  }

  // Clé publique, sans session : la signature Whop tient lieu d'authentification.
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("handle_whop_webhook", {
    p_webhook_id: webhookId,
    p_timestamp: timestamp,
    p_signatures: signatures,
    p_body: rawBody,
    p_plan_id: WHOP_PLAN_ID,
  });
  if (error) {
    // Réponse 500 : Whop relivrera l'événement.
    console.error("[webhook whop] handle_whop_webhook a échoué", error);
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }

  const result = data as WebhookResult;
  switch (result.status) {
    case "invalid_signature":
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    case "invalid_body":
      return NextResponse.json({ error: "Format inattendu" }, { status: 400 });
    case "not_configured":
      console.error("[webhook whop] secret absent : enregistre-le dans public.app_secrets (migration 0004)");
      return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
    case "ignored":
      return NextResponse.json({ received: true, ignored: result.reason });
    default:
      if (result.matched === false && !result.pending) {
        console.warn("[webhook whop] aucun compte correspondant", { plan: result.plan });
      }
      return NextResponse.json({ received: true, ...result, status: undefined });
  }
}
