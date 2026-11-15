import type { MetadataRoute } from "next";

/** Permet d'ajouter Swipo à l'écran d'accueil du téléphone, avec son icône, comme une application. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swipo",
    short_name: "Swipo",
    description: "Le suivi de chantiers des entreprises de nettoyage.",
    // Chacun arrive dans son espace (agent ou gérant), ou sur la connexion.
    start_url: "/ouvrir",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#1663a6",
    lang: "fr",
    icons: [
      { src: "/brand/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
