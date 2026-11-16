// Adresse publique du site (sans « / » final). À changer le jour où Swipo a son propre nom de domaine.
export const SITE_URL = (process.env.SITE_URL ?? "https://swipo.vercel.app").replace(/\/$/, "");
