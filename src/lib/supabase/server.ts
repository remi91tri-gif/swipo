import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Client Supabase côté serveur, avec la session de l'utilisateur (cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    // Next.js mémorise les requêtes GET identiques pendant un même affichage : une relecture
    // juste après une écriture renverrait l'ancien résultat. Un signal neuf désactive cette mémoire.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? new AbortController().signal }),
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un composant serveur : le middleware rafraîchit déjà la session.
        }
      },
    },
  });
}
