import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemo, supabaseAnonKey, supabaseUrl } from "@/lib/env";

const PUBLIC_PATHS = ["/connexion", "/inscription", "/agent/connexion"];

/** Rafraîchit la session et renvoie vers la connexion si besoin. */
export async function updateSession(request: NextRequest) {
  if (isDemo) return NextResponse.next({ request });
  // Page d'accueil publique et statique : rien à vérifier.
  if (request.nextUrl.pathname === "/") return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Vérifie le jeton localement (clé publique du projet) : pas d'appel réseau à chaque page.
  // Si le jeton a expiré, il est rafraîchi et les nouveaux cookies sont posés.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  // Déjà connecté : la page de connexion mène directement à son espace.
  if (user && (path === "/connexion" || path === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/aujourdhui";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/agent") ? "/agent/connexion" : "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
