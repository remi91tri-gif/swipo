"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type ClientFormState = { error?: string; fields?: Record<string, string> } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const TYPES = ["particulier", "professionnel", "syndic", "agence"];

export async function createClientAction(_: ClientFormState, fd: FormData): Promise<ClientFormState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut ajouter un client." };
  const fields = { name: s(fd, "name"), type: s(fd, "type"), phone: s(fd, "phone"), email: s(fd, "email"), address: s(fd, "address"), access: s(fd, "access") };
  if (!fields.name) return { error: "Indiquez le nom du client.", fields };
  if (!fields.address) return { error: "Indiquez au moins une adresse d'intervention.", fields };
  if (isDemo) return { error: "Mode démonstration : le client n'est pas enregistré.", fields };

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_id: session.company.id,
      name: fields.name,
      type: TYPES.includes(fields.type) ? fields.type : "particulier",
      phone: fields.phone ? toE164(fields.phone) : null,
      email: fields.email || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Le client n'a pas pu être enregistré.", fields };
  const { error: siteError } = await supabase
    .from("sites")
    .insert({ company_id: session.company.id, client_id: client.id, address: fields.address, access_info: fields.access || null });
  if (siteError) return { error: "Le client est créé, mais pas son adresse. Ajoutez-la depuis sa fiche.", fields };
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function addSiteAction(clientId: string, _: ClientFormState, fd: FormData): Promise<ClientFormState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut ajouter une adresse." };
  const address = s(fd, "address");
  if (!address) return { error: "Indiquez l'adresse." };
  if (isDemo) return { error: "Mode démonstration : l'adresse n'est pas enregistrée." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .insert({ company_id: session.company.id, client_id: clientId, address, access_info: s(fd, "access") || null, onsite_contact: s(fd, "onsite") || null, label: s(fd, "label") || null });
  if (error) return { error: "L'adresse n'a pas pu être enregistrée." };
  revalidatePath(`/clients/${clientId}`);
  return {};
}
