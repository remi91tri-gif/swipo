import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemo, supabaseAnonKey, supabaseUrl } from "@/lib/env";

const PUBLIC_PATHS = ["/connexion", "/inscription", "/agent/connexion", "/rejoindre", "/api/stripe", "/api/cron", "/mentions-legales", "/conditions", "/confidentialite", "/mot-de-passe-oublie", "/auth/confirmer"];

/** Seules pages ouvertes à un agent connecté par lien. */
const AGENT_PATHS = ["/agent", "/rejoindre", "/auth", "/api", "/mot-de-passe-oublie", "/nouveau-mot-de-passe", "/mentions-legales", "/conditions", "/confidentialite"];

/** Rafraîchit la session et renvoie vers la connexion si besoin. */
export async function updateSession(request: NextRequest) {
  // Chemin demandé, transmis aux pages (les espaces s'en servent pour l'accès à l'abonnement).
  request.headers.set("x-pathname", request.nextUrl.pathname);
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

  // Agent ou chef d'équipe (session « appareil » sans e-mail, ou compte marqué « agent » par le serveur) :
  // uniquement l'espace agent. Toute autre page (espace gérant, connexion gérant…) le ramène à ses missions.
  const fieldUser = user?.is_anonymous === true || (user?.app_metadata as { swipo_espace?: string } | undefined)?.swipo_espace === "agent";
  if (fieldUser && !AGENT_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/agent";
    url.search = "";
    return NextResponse.redirect(url);
  }

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
