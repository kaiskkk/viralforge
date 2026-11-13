import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Déconnexion. En POST uniquement : un simple lien ne doit pas pouvoir déconnecter. */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    await createClient().auth.signOut();
  }

  revalidatePath("/", "layout");
  // 303 : le navigateur enchaîne en GET sur la page d'accueil.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
