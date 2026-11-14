"use client";

import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { StatusPill } from "@/components/ui";
import { timeLabel } from "@/lib/format";
import { useQueued } from "@/lib/offline/sync";
import type { AgentMission, JobStatus } from "@/lib/types";

function withList(names: string[]) {
  const n = names.filter(Boolean);
  if (n.length === 0) return "Seul";
  if (n.length === 1) return `Avec ${n[0]}`;
  return `Avec ${n.slice(0, -1).join(", ")} et ${n.at(-1)}`;
}

function Pending() {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-soleil-soft px-2.5 py-0.5 text-[13px] leading-[18px] font-semibold tracking-normal text-soleil-ink">
      À envoyer
    </span>
  );
}

/** Les missions du jour, avec les gestes faits hors connexion déjà pris en compte. */
export function DayList({ dateLabel, firstName, missions }: { dateLabel: string; firstName: string; missions: AgentMission[] }) {
  const queued = useQueued();
  const pending = new Set(queued.map((q) => q.jobId));
  const effective = missions.map((m) => {
    let status: JobStatus = m.status;
    for (const q of queued) {
      if (q.jobId !== m.id) continue;
      if (q.kind === "start" && (status === "planifie" || status === "a_reprendre")) status = "en_cours";
      if (q.kind === "incident" && q.urgency === "bloquant" && status === "en_cours") status = "a_traiter";
      if (q.kind === "finish") status = "termine";
    }
    return { ...m, status };
  });
  const [next, ...later] = effective.filter((m) => m.status !== "termine");
  const finished = effective.filter((m) => m.status === "termine");
  const done = finished.length;

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-4 pb-8 text-base leading-6">
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">{dateLabel}</p>
        <h1 className="font-display text-[30px] leading-[38px] font-semibold tracking-[-0.025em]">Bonjour {firstName}</h1>
        <p className="text-ink-muted">
          {missions.length === 0
            ? "Aucun chantier aujourd'hui."
            : `${missions.length} chantier${missions.length > 1 ? "s" : ""} aujourd'hui${done ? `, ${done} terminé${done > 1 ? "s" : ""}` : ""}.`}
        </p>
      </div>

      {next && (
        <Link href={`/agent/mission/${next.id}`} className="flex flex-col gap-4 rounded-2xl bg-ink p-[22px] text-on-ink shadow-hero">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.06em]">
              <span className="opacity-70">PROCHAIN CHANTIER</span>
              {pending.has(next.id) && <Pending />}
            </span>
            <span className="font-display text-[22px] font-medium tracking-[-0.02em] tabular-nums">{timeLabel(next.startTime)}</span>
          </div>
          <h2 className="font-display text-[22px] leading-[30px] font-semibold tracking-[-0.02em]">{next.title}</h2>
          <div className="flex flex-col gap-1.5 text-[15px] opacity-80">
            <span className="flex items-center gap-2.5">
              <MapPin aria-hidden size={18} strokeWidth={1.75} />
              {next.address}
            </span>
            <span className="flex items-center gap-2.5">
              <Users aria-hidden size={18} strokeWidth={1.75} />
              {withList(next.teammates)}
            </span>
          </div>
          <span className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface-raised font-semibold text-ink">
            {next.status === "en_cours" || next.status === "a_traiter" ? "Reprendre la mission" : "Ouvrir la mission"}
          </span>
        </Link>
      )}

      {later.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">ENSUITE</h2>
          {later.map((m) => (
            <Link key={m.id} href={`/agent/mission/${m.id}`} className="flex items-center gap-4 rounded-xl border border-line bg-surface-raised p-[18px] text-ink">
              <span className="w-[52px] font-display text-lg font-medium tracking-[-0.02em] tabular-nums">{timeLabel(m.startTime)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-sm text-ink-muted">
                  {m.address} · {withList(m.teammates).replace(/^(Avec|Seul)/, (w) => w.toLowerCase())}
                </span>
              </span>
              {pending.has(m.id) ? <Pending /> : m.status !== "planifie" && <StatusPill status={m.status} />}
            </Link>
          ))}
        </section>
      )}
      {finished.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">TERMINÉS</h2>
          {finished.map((m) => (
            <Link key={m.id} href={`/agent/mission/${m.id}`} className="flex items-center gap-4 rounded-xl border border-line bg-surface-raised p-[18px] text-ink">
              <span className="w-[52px] font-display text-lg font-medium tracking-[-0.02em] text-ink-muted tabular-nums">{timeLabel(m.startTime)}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-muted">{m.title}</span>
              {pending.has(m.id) ? <Pending /> : <StatusPill status="termine" />}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
