"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addressError, fullAddress, readAddress } from "@/lib/address";

export type ClientFormState = { error?: string; fields?: Record<string, string>; url?: string } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const TYPES = ["particulier", "professionnel", "syndic", "agence"];

export async function createClientAction(_: ClientFormState, fd: FormData): Promise<ClientFormState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut ajouter un client." };
  const a = readAddress(fd);
  const fields = { name: s(fd, "name"), type: s(fd, "type"), phone: s(fd, "phone"), email: s(fd, "email"), street: a.street, postal_code: a.postalCode, city: a.city, access: s(fd, "access") };
  if (!fields.name) return { error: "Indiquez le nom du client.", fields };
  const bad = addressError(a);
  if (bad) return { error: bad, fields };
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
    .insert({ company_id: session.company.id, client_id: client.id, address: fullAddress(a.street, a.postalCode, a.city), street: a.street, postal_code: a.postalCode, city: a.city, access_info: fields.access || null });
  if (siteError) return { error: "Le client est créé, mais pas son adresse. Ajoutez-la depuis sa fiche.", fields };
  return { url: `/clients/${client.id}` };
}

export async function addSiteAction(clientId: string, _: ClientFormState, fd: FormData): Promise<ClientFormState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut ajouter une adresse." };
  const a = readAddress(fd);
  const bad = addressError(a);
  if (bad) return { error: bad };
  if (isDemo) return { error: "Mode démonstration : l'adresse n'est pas enregistrée." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .insert({ company_id: session.company.id, client_id: clientId, address: fullAddress(a.street, a.postalCode, a.city), street: a.street, postal_code: a.postalCode, city: a.city, access_info: s(fd, "access") || null, onsite_contact: s(fd, "onsite") || null, label: s(fd, "label") || null });
  if (error) return { error: "L'adresse n'a pas pu être enregistrée." };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

type Result = { error?: string };

/** Modifie les coordonnées d'un client. */
export async function updateClientAction(
  clientId: string,
  input: { name: string; type: string; contactName: string; phone: string; email: string; notes: string },
): Promise<Result> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut modifier un client." };
  const name = input.name.trim();
  if (!name) return { error: "Indiquez le nom du client." };
  const email = input.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "L'adresse e-mail n'est pas valide." };
  if (isDemo) return { error: "Mode démonstration : rien n'est enregistré." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      type: TYPES.includes(input.type) ? input.type : "particulier",
      contact_name: input.contactName.trim() || null,
      phone: input.phone.trim() ? toE164(input.phone) : null,
      email: email || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", clientId)
    .eq("company_id", session.company.id);
  if (error) return { error: "Le client n'a pas pu être modifié." };
  revalidatePath("/clients", "layout");
  revalidatePath("/chantiers", "layout");
  return {};
}

/** Modifie une adresse d'intervention (les chantiers à venir l'utilisent aussitôt). */
export async function updateSiteAction(
  clientId: string,
  siteId: string,
  input: { label: string; street: string; postalCode: string; city: string; accessInfo: string; onsiteContact: string },
): Promise<Result> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut modifier une adresse." };
  const bad = addressError(input);
  if (bad) return { error: bad };
  if (isDemo) return { error: "Mode démonstration : rien n'est enregistré." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({
      address: fullAddress(input.street, input.postalCode, input.city),
      street: input.street.trim(),
      postal_code: input.postalCode.trim(),
      city: input.city.trim(),
      label: input.label.trim() || null,
      access_info: input.accessInfo.trim() || null,
      onsite_contact: input.onsiteContact.trim() || null,
    })
    .eq("id", siteId)
    .eq("client_id", clientId)
    .eq("company_id", session.company.id);
  if (error) return { error: "L'adresse n'a pas pu être modifiée." };
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/chantiers", "layout");
  return {};
}
