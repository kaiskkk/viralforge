import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

const PROTECTED_PREFIX = "/dashboard";
const AUTH_PAGES = new Set(["/login", "/signup"]);

/**
 * Rafraîchit la session Supabase à chaque requête et applique les redirections :
 *   - /dashboard/* sans session  → /login
 *   - /login ou /signup connecté → /dashboard
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith(PROTECTED_PREFIX);

  if (!isSupabaseConfigured) {
    return isProtected
      ? NextResponse.redirect(new URL("/login?error=config", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // En-têtes anti-cache : une réponse qui pose un cookie de session
        // ne doit jamais être mise en cache par un CDN.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getUser() valide le jeton auprès de Supabase : ne pas remplacer par
  // getSession(), qui se contente de lire le cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Conserve les cookies de session éventuellement rafraîchis.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && isProtected) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname)}`);
  }

  // Déjà connecté : les pages de connexion et la page d'accueil mènent droit
  // au tableau de bord, pour « retomber » directement dans l'app.
  if (user && (AUTH_PAGES.has(pathname) || pathname === "/")) {
    return redirectTo("/dashboard");
  }

  return response;
}
