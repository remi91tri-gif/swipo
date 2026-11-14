"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bell, BellRing, CalendarClock, CheckCheck, CheckCircle2, Clock, RotateCcw, Sparkles, X } from "lucide-react";
import { watchActions, whenIdle } from "@/lib/when-idle";
import { describe, dismissToast, markAllRead, markRead, startFeed, timeAgo, useNotifications, type Notif, type Role } from "@/lib/notifications";

const TONE = {
  azur: "bg-azur-soft text-azur",
  critique: "bg-critique-soft text-critique",
  reprise: "bg-reprise-soft text-reprise",
  valide: "bg-valide-soft text-valide",
  soleil: "bg-soleil-soft text-soleil-ink",
} as const;

const ICON: Record<string, typeof Bell> = {
  mission_assignee: Sparkles,
  chantier_termine: CheckCircle2,
  imprevu_bloquant: AlertCircle,
  imprevu_info: AlertCircle,
  decision_gerant: BellRing,
  reprise_demandee: RotateCcw,
  chantier_en_retard: Clock,
  mission_modifiee: CalendarClock,
  mission_retiree: X,
  mission_annulee: X,
};

function Row({ n, role, onOpen }: { n: Notif; role: Role; onOpen: () => void }) {
  const d = describe(n, role);
  const Icon = ICON[n.type] ?? Bell;
  return (
    <Link
      href={d.href}
      onClick={() => {
        void markRead([n.id]);
        onOpen();
      }}
      className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-hairline"
    >
      <span className={`flex size-9 flex-none items-center justify-center rounded-full ${TONE[d.tone]}`}>
        <Icon aria-hidden size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-[15px] ${n.read ? "font-medium text-ink-muted" : "font-semibold text-ink"}`}>{d.title}</span>
          <span className="flex-none text-[12px] text-ink-muted">{timeAgo(n.createdAt)}</span>
        </span>
        <span className="block truncate text-sm text-ink-muted">{d.body}</span>
      </span>
      {!n.read && <span aria-label="Non lue" className="mt-2 size-2 flex-none rounded-full bg-azur" />}
    </Link>
  );
}

/** Écoute les notifications en direct, affiche les bulles et rafraîchit la page ouverte. */
export function NotificationsFeed({ memberId, role }: { memberId: string; role: Role }) {
  const { toasts } = useNotifications();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    watchActions();
    // Mise à jour de l'écran par un simple rechargement, et seulement quand il montre ce qui a changé
    // et que personne n'est en train de saisir ou d'envoyer quelque chose. (Rafraîchir la navigation
    // interne pendant une action pouvait bloquer la page.) Sinon, la bulle suffit.
    const reloadIfUseful = (n: Notif) => {
      const p = path.current;
      const shows = p === "/aujourdhui" || p === "/agent" || (n.jobId !== null && (p === `/chantiers/${n.jobId}` || p === `/agent/mission/${n.jobId}`));
      if (!shows) return;
      whenIdle(() => {
        const el = document.activeElement;
        const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
        if (!typing && !document.querySelector("[role=dialog]")) window.location.reload();
      });
    };
    return startFeed(memberId, role, reloadIfUseful);
  }, [memberId, role]);

  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5">
      {toasts.map((n) => {
        const d = describe(n, role);
        const Icon = ICON[n.type] ?? Bell;
        return (
          <div key={n.id} className="toast-in pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-2xl border border-line bg-surface-raised p-3.5 shadow-hero">
            <span className={`flex size-9 flex-none items-center justify-center rounded-full ${TONE[d.tone]}`}>
              <Icon aria-hidden size={17} />
            </span>
            <Link href={d.href} onClick={() => { void markRead([n.id]); dismissToast(n.id); }} className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{d.title}</span>
              <span className="block truncate text-sm text-ink-muted">{d.body}</span>
            </Link>
            <button type="button" aria-label="Fermer" onClick={() => dismissToast(n.id)} className="-m-1 rounded-full p-1 text-ink-muted hover:bg-hairline">
              <X aria-hidden size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Cloche avec le nombre de notifications non lues, et la liste au clic. */
export function NotificationBell({ role, placement }: { role: Role; placement: "sidebar" | "agent" }) {
  const { items, loaded } = useNotifications();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "absent">("absent");
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "absent" : Notification.permission);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const where =
    placement === "sidebar"
      ? "max-[871px]:inset-x-3 max-[871px]:top-16 min-[872px]:left-[244px] min-[872px]:top-5 min-[872px]:w-[400px]"
      : "inset-x-3 top-16";

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted transition-colors hover:text-ink"
      >
        <Bell aria-hidden size={17} className={unread ? "bell-ring" : ""} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-critique px-1 text-[11px] font-semibold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label="Notifications" className={`panel-in fixed z-50 flex max-h-[min(560px,calc(100dvh-96px))] flex-col rounded-2xl border border-line bg-surface-raised shadow-hero ${where}`}>
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <p className="font-display text-[17px] font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1.5 text-sm font-semibold text-azur hover:underline">
                <CheckCheck aria-hidden size={15} /> Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!loaded ? (
              <p className="px-3 py-6 text-center text-ink-muted">Chargement…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-hairline text-ink-muted"><Bell aria-hidden size={20} /></span>
                <p className="font-semibold">Rien de nouveau</p>
                <p className="text-sm text-ink-muted">{role === "agent" ? "Vos nouvelles missions et les réponses de votre gérant s'afficheront ici." : "Imprévus, chantiers terminés et retards s'afficheront ici, en direct."}</p>
              </div>
            ) : (
              items.map((n) => <Row key={n.id} n={n} role={role} onOpen={() => setOpen(false)} />)
            )}
          </div>
          {permission === "default" && (
            <div className="border-t border-hairline p-3">
              <button
                type="button"
                onClick={async () => setPermission(await Notification.requestPermission())}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-azur-subtle px-4 py-3 text-sm font-semibold text-azur hover:bg-azur-soft"
              >
                <BellRing aria-hidden size={16} /> Recevoir aussi les alertes sur cet appareil
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
