import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Point d'entrée de l'icône Swipo sur l'écran d'accueil du téléphone :
 * chacun arrive dans son espace ; sans connexion, on propose la connexion agent (qui renvoie vers l'espace gérant si besoin).
 */
export default async function Ouvrir() {
  const session = await getSession();
  if (!session) redirect("/agent/connexion");
  redirect(session.member.role === "gerant" ? "/aujourdhui" : "/agent");
}
