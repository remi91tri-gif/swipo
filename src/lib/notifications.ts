"use client";

import { useSyncExternalStore } from "react";
import { isDemo } from "@/lib/env";
import { browserClient } from "@/lib/supabase/client";

export type Notif = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  jobId: string | null;
  job: { title: string; client: string | null; date: string | null; time: string | null } | null;
};

export type Role = "gerant" | "chef" | "agent";

type Row = {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  job_id: string | null;
  jobs: { title: string; scheduled_date: string | null; start_time: string | null; clients: { name: string } | null } | null;
};

const COLUMNS = "id, type, read, created_at, job_id, jobs(title, scheduled_date, start_time, clients(name))";

function toNotif(r: Row): Notif {
  return {
    id: r.id,
    type: r.type,
    read: r.read,
    createdAt: r.created_at,
    jobId: r.job_id,
    job: r.jobs ? { title: r.jobs.title, client: r.jobs.clients?.name ?? null, date: r.jobs.scheduled_date, time: r.jobs.start_time } : null,
  };
}

/** « aujourd'hui à 10:00 », « demain à 8:30 », « le 3 déc. à 9:00 ». */
function when(date: string | null, time: string | null) {
  if (!date) return "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() + 86400000));
  const day =
    date === today
      ? "aujourd'hui"
      : date === tomorrow
        ? "demain"
        : `le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}`;
  return time ? `${day} à ${time.slice(0, 5).replace(/^0/, "")}` : day;
}

/** Titre, texte, lien et ton d'une notification, selon qui la lit. */
export function describe(n: Notif, role: Role) {
  const job = n.job?.title ?? "Chantier";
  const place = n.job?.client ?? job;
  const href = n.jobId ? (role === "agent" ? `/agent/mission/${n.jobId}` : `/chantiers/${n.jobId}`) : role === "agent" ? "/agent" : "/aujourdhui";
  const t: Record<string, { title: string; body: string; tone: "azur" | "critique" | "reprise" | "valide" | "soleil" }> = {
    mission_assignee: { title: "Nouvelle mission", body: [job, n.job?.client, when(n.job?.date ?? null, n.job?.time ?? null)].filter(Boolean).join(" · "), tone: "azur" },
    chantier_termine: { title: "Chantier terminé", body: place, tone: "valide" },
    imprevu_bloquant: { title: "Imprévu bloquant", body: `${place} : une décision est attendue`, tone: "critique" },
    imprevu_info: { title: "Imprévu signalé", body: place, tone: "soleil" },
    decision_gerant: { title: "Réponse de votre gérant", body: job, tone: "azur" },
    reprise_demandee: { title: "Reprise demandée", body: job, tone: "reprise" },
    mission_modifiee: { title: "Mission modifiée", body: [job, when(n.job?.date ?? null, n.job?.time ?? null)].filter(Boolean).join(" · "), tone: "soleil" },
    mission_retiree: { title: "Mission retirée", body: "Vous n'êtes plus affecté à un chantier", tone: "reprise" },
    mission_annulee: { title: "Mission annulée", body: job, tone: "critique" },
    chantier_en_retard: { title: "Chantier non démarré", body: `${place} devait commencer il y a plus de 30 min`, tone: "soleil" },
  };
  // Mission retirée ou annulée : l'agent ne voit plus la fiche, on le ramène à sa journée.
  const gone = n.type === "mission_retiree" || n.type === "mission_annulee";
  return { ...(t[n.type] ?? { title: "Notification", body: job, tone: "azur" as const }), href: gone && role === "agent" ? "/agent" : href };
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
}

// --- Magasin partagé (une seule connexion en direct par page) ----------------------------------
type State = { items: Notif[]; toasts: Notif[]; loaded: boolean };
let state: State = { items: [], toasts: [], loaded: false };
const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useNotifications() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

// Les bulles survivent au rechargement de la page qui suit une notification.
const TOASTS_KEY = "swipo-bulles";
function keepToasts(toasts: Notif[]) {
  try {
    sessionStorage.setItem(TOASTS_KEY, JSON.stringify({ at: Date.now(), toasts }));
  } catch {}
}
function restoreToasts(): Notif[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(TOASTS_KEY) ?? "null") as { at: number; toasts: Notif[] } | null;
    return raw && Date.now() - raw.at < 8000 ? raw.toasts : [];
  } catch {
    return [];
  }
}

export function dismissToast(id: string) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
  keepToasts(state.toasts);
}

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  set({ items: state.items.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) });
  if (!isDemo) await browserClient().from("notifications").update({ read: true }).in("id", ids);
}

export function markAllRead() {
  return markRead(state.items.filter((n) => !n.read).map((n) => n.id));
}

/** Alerte de l'appareil (téléphone, ordinateur) quand Swipo n'est pas au premier plan. */
async function systemAlert(n: Notif, role: Role) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
  const d = describe(n, role);
  const options = { body: d.body, icon: "/icon.svg", tag: n.id, data: { href: d.href } };
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined);
  if (reg) return reg.showNotification(d.title, options);
  const shown = new Notification(d.title, options);
  shown.onclick = () => {
    window.focus();
    window.location.href = d.href;
  };
}

/**
 * Charge les dernières notifications puis écoute les nouvelles en direct.
 * `onNew` permet de rafraîchir la page affichée (tableau de bord, mission…).
 */
export function startFeed(memberId: string, role: Role, onNew: (n: Notif) => void) {
  if (isDemo) {
    set({ loaded: true });
    return () => {};
  }
  const sb = browserClient();
  let alive = true;
  const restored = restoreToasts();
  if (restored.length) {
    set({ toasts: restored });
    restored.forEach((t) => setTimeout(() => dismissToast(t.id), 6000));
  }
  sb.from("notifications")
    .select(COLUMNS)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(30)
    .then(({ data }: { data: unknown[] | null }) => {
      if (alive) set({ items: ((data ?? []) as unknown as Row[]).map(toNotif), loaded: true });
    });

  // La connexion en direct doit porter le jeton de l'utilisateur, sinon la base ne lui envoie rien.
  let channel: ReturnType<typeof sb.channel> | null = null;
  void (async () => {
    const { data: auth } = await sb.auth.getSession();
    if (!alive) return;
    if (auth.session) await sb.realtime.setAuth(auth.session.access_token);
    channel = sb
      .channel(`notifications-${memberId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `member_id=eq.${memberId}` }, async (payload: { new: Record<string, unknown> }) => {
        const id = (payload.new as { id: string }).id;
        const { data } = await sb.from("notifications").select(COLUMNS).eq("id", id).maybeSingle();
        if (!data || !alive) return;
        const n = toNotif(data as unknown as Row);
        if (state.items.some((x) => x.id === n.id)) return;
        set({ items: [n, ...state.items].slice(0, 50), toasts: [...state.toasts, n].slice(-3) });
      keepToasts(state.toasts);
        setTimeout(() => dismissToast(n.id), 8000);
        void systemAlert(n, role);
        onNew(n);
      })
      .subscribe();
  })();

  return () => {
    alive = false;
    if (channel) void sb.removeChannel(channel);
  };
}
