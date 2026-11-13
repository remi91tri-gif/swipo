import type { Metadata } from "next";
import { LogOut, MapPin, Users } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { ThemeButton } from "@/components/theme-toggle";
import { StatusPill } from "@/components/ui";
import { getAgentDay, getAgentSession } from "@/lib/data";
import { timeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Mes chantiers" };

function withList(names: string[]) {
  const n = names.filter(Boolean);
  if (n.length === 0) return "Seul";
  if (n.length === 1) return `Avec ${n[0]}`;
  return `Avec ${n.slice(0, -1).join(", ")} et ${n.at(-1)}`;
}

export default async function AgentTodayPage() {
  const session = (await getAgentSession())!;
  const day = await getAgentDay(session);
  const [next, ...later] = day.missions.filter((m) => m.status !== "termine");
  const done = day.missions.filter((m) => m.status === "termine").length;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/swipo-symbole.svg" alt="Swipo" width={32} height={32} />
        <div className="flex items-center gap-2">
          <ThemeButton />
          <form action={signOut}>
            <button type="submit" aria-label="Se déconnecter" className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted">
              <LogOut aria-hidden size={16} />
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-5 pt-4 pb-8 text-base leading-6">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">{day.dateLabel}</p>
          <h1 className="font-display text-[30px] leading-[38px] font-semibold tracking-[-0.025em]">Bonjour {session.member.firstName}</h1>
          <p className="text-ink-muted">
            {day.missions.length === 0
              ? "Aucun chantier aujourd'hui."
              : `${day.missions.length} chantier${day.missions.length > 1 ? "s" : ""} aujourd'hui${done ? `, ${done} terminé${done > 1 ? "s" : ""}` : ""}.`}
          </p>
        </div>

        {next && (
          <article className="flex flex-col gap-4 rounded-2xl bg-ink p-[22px] text-on-ink shadow-hero">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold tracking-[0.06em] opacity-70">PROCHAIN CHANTIER</span>
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
            <p className="border-t border-current/15 pt-3 text-sm opacity-70">Le détail de la mission (démarrer, photos, checklist) arrive au lot 3.</p>
          </article>
        )}

        {later.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">ENSUITE</h2>
            {later.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border border-line bg-surface-raised p-[18px]">
                <span className="w-[52px] font-display text-lg font-medium tracking-[-0.02em] tabular-nums">{timeLabel(m.startTime)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-ink-muted">
                    {m.address} · {withList(m.teammates).replace(/^(Avec|Seul)/, (w) => w.toLowerCase())}
                  </span>
                </span>
                {m.status !== "planifie" && <StatusPill status={m.status} />}
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
