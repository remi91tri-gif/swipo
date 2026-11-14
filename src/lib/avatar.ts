import { supabaseUrl } from "./env";

/** Adresse publique d'une photo de profil (espace « avatars »), ou null sans photo. */
export function avatarUrl(path: string | null | undefined) {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
}
