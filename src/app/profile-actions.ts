"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Enregistre (ou retire) la photo de profil déjà déposée par le navigateur, et supprime l'ancienne. */
export async function saveMyAvatar(path: string | null): Promise<{ error?: string }> {
  if (isDemo) return { error: "Mode démonstration : rien n'est enregistré." };
  const session = await getSession();
  if (!session) return { error: "Session expirée. Reconnectez-vous." };
  const supabase = await createClient();
  const { data: before } = await supabase.from("members").select("avatar_path").eq("id", session.member.id).single();
  const { error } = await supabase.rpc("set_my_avatar", { p_company: session.company.id, p_path: path });
  if (error) return { error: "La photo n'a pas pu être enregistrée." };
  const old = before?.avatar_path as string | null | undefined;
  if (old && old !== path) await supabase.storage.from("avatars").remove([old]);
  revalidatePath("/", "layout");
  return {};
}
