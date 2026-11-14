import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isDemo } from "./env";
import { demoAgentDay, demoAgentSession, demoDashboard, demoMembers, demoSession } from "./demo";
import { createClient } from "./supabase/server";
import { todayLabel } from "./format";
import { avatarUrl } from "./avatar";
import type { AgentDay, Billing, Dashboard, JobStatus, JobSummary, Member, Session, TeamNow } from "./types";

type MemberRow = {
  id: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: Member["role"];
  active: boolean;
  avatar_path: string | null;
};

const MEMBER_COLUMNS = "id, company_id, user_id, first_name, last_name, phone, email, role, active, avatar_path";
const COMPANY_COLUMNS =
  "id, name, plan, subscription_status, trial_ends_at, pilot_until, pilot_discount, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id";

type CompanyRow = {
  id: string;
  name: string;
  plan: Billing["plan"];
  subscription_status: string;
  trial_ends_at: string;
  pilot_until: string | null;
  pilot_discount: boolean;
  billing_interval: Billing["interval"];
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
};

/** Même règle que la fonction company_access de la base. */
function toBilling(c: CompanyRow): Billing {
  const now = Date.now();
  const access: Billing["access"] =
    c.pilot_until && new Date(c.pilot_until).getTime() > now
      ? "pilote"
      : c.subscription_status === "active" || c.subscription_status === "past_due"
        ? "actif"
        : new Date(c.trial_ends_at).getTime() > now
          ? "essai"
          : "expire";
  return {
    access,
    plan: c.plan,
    status: c.subscription_status,
    trialEndsAt: c.trial_ends_at,
    pilotUntil: c.pilot_until,
    pilotDiscount: c.pilot_discount,
    interval: c.billing_interval,
    periodEnd: c.current_period_end,
    cancelAtPeriodEnd: c.cancel_at_period_end,
    hasCustomer: !!c.stripe_customer_id,
  };
}

function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    companyId: r.company_id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    email: r.email,
    role: r.role,
    active: r.active,
    hasAccount: !!r.user_id,
    avatarUrl: avatarUrl(r.avatar_path),
  };
}

/** Date du jour à Nice, au format AAAA-MM-JJ. */
function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function cityOf(address: string | null | undefined) {
  if (!address) return "";
  const part = address.split(",").pop()?.trim() ?? "";
  return part.replace(/^\d{5}\s*/, "");
}

function timeOf(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

/**
 * L'utilisateur connecté et son entreprise. À la première connexion d'un gérant,
 * l'entreprise saisie à l'inscription est créée ici.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (isDemo) return demoSession;
  const supabase = await createClient();
  // Jeton vérifié localement avec la clé publique du projet (pas d'appel réseau).
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) {
    if (authError && authError.name !== "AuthSessionMissingError") console.error("getSession: session illisible", authError.name, authError.message);
    return null;
  }
  const user = {
    id: claims.sub,
    phone: (claims.phone as string | undefined) || null,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };

  const load = () =>
    supabase
      .from("members")
      .select(`${MEMBER_COLUMNS}, companies(${COMPANY_COLUMNS})`)
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

  const first = await load();
  if (first.error) console.error("getSession: lecture du membre impossible", first.error);
  let data = first.data;
  const meta = user.user_metadata ?? {};
  if (!data && typeof meta.company_name === "string" && meta.company_name) {
    const created = await supabase.rpc("create_company", {
      p_name: meta.company_name,
      p_first_name: meta.first_name ?? "",
      p_last_name: meta.last_name ?? "",
      p_phone: meta.phone ?? null,
      p_trades: Array.isArray(meta.trades) ? meta.trades : [],
    });
    if (created.error) console.error("getSession: création de l'entreprise", created.error);
    const second = await load();
    if (second.error) console.error("getSession: relecture", second.error);
    data = second.data;
  }
  if (!data && user.phone) {
    await supabase.rpc("claim_invitation");
    ({ data } = await load());
  }
  if (!data) {
    console.error("getSession: aucun membre pour", user.id);
    return null;
  }

  const c = (Array.isArray(data.companies) ? data.companies[0] : data.companies) as CompanyRow;
  return { company: { id: c.id, name: c.name }, member: toMember(data as MemberRow), billing: toBilling(c) };
});

/** Session obligatoire : sans connexion valide, retour à la page de connexion. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}

/** Session de l'espace agent. En démonstration, on y voit Karim, un agent. */
export async function getAgentSession(): Promise<Session | null> {
  if (isDemo) return demoAgentSession;
  return getSession();
}

/** Missions du jour de l'agent connecté (la sécurité de la base ne lui renvoie que les siennes). */
export async function getAgentDay(session: Session): Promise<AgentDay> {
  if (isDemo) return demoAgentDay();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, start_time, status, sites(address, access_info), job_assignments(member_id)")
    .eq("company_id", session.company.id)
    .eq("scheduled_date", parisToday())
    .in("status", ["planifie", "en_cours", "a_traiter", "a_reprendre", "termine"])
    .order("start_time", { nullsFirst: false });
  if (error) throw error;
  const { data: people } = await supabase.from("members").select("id, first_name").eq("company_id", session.company.id);
  const names = new Map((people ?? []).map((p) => [p.id as string, p.first_name as string]));
  type Row = { id: string; title: string; start_time: string | null; status: JobStatus; sites: { address: string } | null; job_assignments: { member_id: string }[] };
  return {
    dateLabel: todayLabel(),
    missions: ((data ?? []) as unknown as Row[]).map((j) => ({
      id: j.id,
      title: j.title,
      address: j.sites?.address ?? "",
      startTime: j.start_time,
      status: j.status,
      teammates: j.job_assignments.filter((a) => a.member_id !== session.member.id).map((a) => names.get(a.member_id) ?? ""),
    })),
  };
}

export async function getTeam(session: Session): Promise<Member[]> {
  if (isDemo) return demoMembers;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("company_id", session.company.id)
    .order("role")
    .order("first_name");
  if (error) throw error;
  return (data as MemberRow[]).map(toMember);
}

type JobRow = {
  id: string;
  title: string;
  start_time: string | null;
  status: JobStatus;
  started_at: string | null;
  finished_at: string | null;
  clients: { name: string } | null;
  sites: { address: string } | null;
  job_assignments: { member_id: string }[];
};

export async function getDashboard(session: Session): Promise<Dashboard> {
  if (isDemo) return demoDashboard();
  const supabase = await createClient();
  const companyId = session.company.id;

  const [jobsRes, membersRes, blockersRes, verifyRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, start_time, status, started_at, finished_at, clients(name), sites(address), job_assignments(member_id)")
      .eq("company_id", companyId)
      .eq("scheduled_date", parisToday())
      .neq("status", "annule")
      .order("start_time", { nullsFirst: false }),
    supabase.from("members").select("id, first_name, last_name, avatar_path").eq("company_id", companyId),
    supabase
      .from("incidents")
      .select("id, job_id, comment, reported_at, reported_by, jobs!inner(title, status, clients(name))")
      .eq("company_id", companyId)
      .eq("urgency", "bloquant")
      .is("decision", null)
      .eq("jobs.status", "a_traiter")
      .order("reported_at"),
    supabase
      .from("jobs")
      .select("id, finished_at, clients(name), photos(count)")
      .eq("company_id", companyId)
      .eq("status", "termine")
      .order("finished_at", { ascending: false })
      .limit(5),
  ]);
  for (const r of [jobsRes, membersRes, blockersRes, verifyRes]) if (r.error) throw r.error;

  const people = new Map(
    (membersRes.data ?? []).map((m) => [
      m.id,
      { id: m.id as string, firstName: m.first_name as string, lastName: m.last_name as string, avatarUrl: avatarUrl(m.avatar_path as string | null) },
    ]),
  );
  const rows = (jobsRes.data ?? []) as unknown as JobRow[];

  const jobs: JobSummary[] = rows.map((j) => ({
    id: j.id,
    title: j.title,
    clientName: j.clients?.name ?? "",
    city: cityOf(j.sites?.address),
    startTime: j.start_time,
    status: j.status,
    team: j.job_assignments.map((a) => people.get(a.member_id)).filter((m): m is NonNullable<typeof m> => !!m),
  }));

  const teamNow = new Map<string, TeamNow>();
  for (const j of rows) {
    if (j.status !== "en_cours" && j.status !== "a_traiter") continue;
    for (const a of j.job_assignments) {
      const m = people.get(a.member_id);
      if (!m) continue;
      const blocked = j.status === "a_traiter";
      teamNow.set(m.id, {
        member: m,
        state: blocked ? "bloque" : "en_cours",
        detail: blocked ? `Bloqué · ${j.clients?.name ?? j.title}` : `${j.title} · depuis ${timeOf(j.started_at)}`,
      });
    }
  }

  type BlockerRow = { id: string; job_id: string; comment: string | null; reported_at: string; reported_by: string; jobs: { title: string; clients: { name: string } | null } };
  const blockers = ((blockersRes.data ?? []) as unknown as BlockerRow[]).map((b) => ({
    jobId: b.job_id,
    incidentId: b.id,
    jobTitle: b.jobs.title,
    place: b.jobs.clients?.name ?? "",
    reportedBy: people.get(b.reported_by)?.firstName ?? "",
    reportedAt: timeOf(b.reported_at),
    comment: b.comment,
  }));

  type VerifyRow = { id: string; finished_at: string | null; clients: { name: string } | null; photos: { count: number }[] };
  const toVerify = ((verifyRes.data ?? []) as unknown as VerifyRow[]).map((v) => ({
    jobId: v.id,
    clientName: v.clients?.name ?? "",
    finishedAt: v.finished_at ? `Terminé à ${timeOf(v.finished_at)}` : "Terminé",
    photoCount: v.photos[0]?.count ?? 0,
  }));

  return {
    dateLabel: todayLabel(),
    jobs,
    blockers,
    toVerify,
    teamNow: [...teamNow.values()],
    counts: {
      prevus: jobs.length,
      enCours: jobs.filter((j) => j.status === "en_cours").length,
      aTraiter: blockers.length,
      aVerifier: toVerify.length,
    },
  };
}
