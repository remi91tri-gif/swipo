"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";
import { getConflicts } from "@/lib/data-jobs";
import { isDemo } from "@/lib/env";
import { toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type JobFormState = { error?: string } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createJobAction(_: JobFormState, fd: FormData): Promise<JobFormState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut créer un chantier." };

  const clientId = s(fd, "client_id");
  const siteId = s(fd, "site_id");
  const title = s(fd, "title");
  const members = fd.getAll("members").map(String).filter(Boolean);
  const lead = s(fd, "lead") || members[0] || null;
  const checklistOn = fd.get("checklist_on") === "on";
  const checklist = checklistOn ? s(fd, "checklist").split("\n").map((l) => l.trim()).filter(Boolean) : [];
  const duration = Number(s(fd, "duration")) || null;

  if (!title) return { error: "Indiquez la prestation." };
  if (clientId === "new" && !s(fd, "new_client_name")) return { error: "Indiquez le nom du nouveau client." };
  if (!clientId) return { error: "Choisissez un client." };
  if ((siteId === "new" || !siteId) && !s(fd, "new_address")) return { error: "Indiquez l'adresse du chantier." };
  if (isDemo) return { error: "Mode démonstration : le chantier n'est pas enregistré." };

  const phone = s(fd, "new_client_phone");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_job", {
    p_title: title,
    p_trade: s(fd, "trade_label"),
    p_client: clientId === "new" ? null : clientId,
    p_new_client: clientId === "new" ? { name: s(fd, "new_client_name"), type: s(fd, "new_client_type") || "particulier", phone: phone ? toE164(phone) : "" } : null,
    p_site: siteId && siteId !== "new" ? siteId : null,
    p_new_site: !siteId || siteId === "new" ? { address: s(fd, "new_address"), access_info: s(fd, "new_access") } : null,
    p_date: s(fd, "date") || null,
    p_time: s(fd, "time") || null,
    p_duration: duration,
    p_instructions: s(fd, "instructions") || null,
    p_photos_required: fd.get("photos_on") === "on",
    p_checklist: checklist,
    p_members: members,
    p_lead: lead,
  });
  if (error) return { error: error.code === "22023" || error.code === "42501" ? error.message : "Le chantier n'a pas pu être créé. Réessayez." };
  redirect(`/chantiers/${data}?cree=1`);
}

export async function checkConflicts(date: string, time: string, duration: number, memberIds: string[]) {
  const session = await getSession();
  if (!session) return [];
  return getConflicts(session, date, time, duration, memberIds);
}
