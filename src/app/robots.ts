import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Google peut lire la vitrine et les pages légales ; les espaces privés ne l'intéressent pas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/rejoindre/", "/ouvrir", "/aujourdhui", "/planning", "/chantiers", "/clients", "/equipe", "/parametres", "/abonnement", "/nouveau-mot-de-passe"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
