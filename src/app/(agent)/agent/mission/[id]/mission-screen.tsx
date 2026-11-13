"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { AlertCircle, Check, ChevronLeft, MapPin, Navigation } from "lucide-react";
import { PhotoCapture } from "@/components/photo-capture";
import { StatusPill } from "@/components/ui";
import { timeLabel } from "@/lib/format";
import type { AgentMissionDetail } from "@/lib/data-agent";
import { finishJob, registerPhoto, setChecklistItem, startJob } from "./actions";

const DECISION: Record<string, string> = {
  continuer: "Continuez le chantier.",
  attendre: "Patientez sur place.",
  reprogrammer: "Le chantier est reprogrammé.",
  ne_pas_effectuer: "Ne pas effectuer ce chantier.",
};

function plural(n: number, word: string) {
  return n === 0 ? "Toucher pour ajouter" : `${n} ${word}${n > 1 ? "s" : ""}`;
}

export function MissionScreen({ mission }: { mission: AgentMissionDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [items, toggleOptimistic] = useOptimistic(mission.checklist, (cur, { id, done }: { id: string; done: boolean }) =>
    cur.map((c) => (c.id === id ? { ...c, done } : c)),
  );

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });

  const onAvant = useCallback(async (path: string) => {
    const res = await registerPhoto(mission.id, "avant", path);
    router.refresh();
    return res;
  }, [mission.id, router]);
  const onApres = useCallback(async (path: string) => {
    const res = await registerPhoto(mission.id, "apres", path);
    router.refresh();
    return res;
  }, [mission.id, router]);

  const before = mission.photos.filter((p) => p.kind === "avant").length;
  const after = mission.photos.filter((p) => p.kind === "apres").length;
  const done = items.filter((c) => c.done).length;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.address)}`;
  const canStart = mission.status === "planifie" || mission.status === "a_reprendre";
  const working = mission.status === "en_cours";
  const blocked = mission.status === "a_traiter";
  const finished = ["termine", "valide"].includes(mission.status);

  const header = (
    <header className="flex items-center gap-2 px-4 pt-4 pb-2">
      <Link href="/agent" aria-label="Retour à mes chantiers" className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-surface-raised text-ink">
        <ChevronLeft aria-hidden size={20} />
      </Link>
      <span className="flex-1 text-center text-sm font-semibold text-ink-muted tabular-nums">{timeLabel(mission.startTime)}</span>
      <span className="flex w-11 justify-end"><StatusPill status={mission.status} /></span>
    </header>
  );

  if (finished) {
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 pb-10 text-center">
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-valide-soft text-valide"><Check size={38} strokeWidth={2.25} /></span>
          <h1 className="mt-2 font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">C&apos;est net.</h1>
          <p className="text-ink-muted">{mission.title} est terminé. Votre gérant a reçu le compte rendu{mission.photos.length ? ` et vos ${mission.photos.length} photos` : ""}.</p>
          <Link href="/agent" className="mt-4 flex h-[58px] w-full items-center justify-center rounded-lg bg-ink text-[17px] font-semibold text-on-ink">Mes chantiers</Link>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-4 text-base leading-6">
        <h1 className="font-display text-[26px] leading-[34px] font-semibold tracking-[-0.025em]">{mission.title}</h1>

        {error && <p role="alert" className="rounded-lg bg-critique-soft px-4 py-3 font-semibold text-critique">{error}</p>}

        {blocked && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-critique-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-critique"><AlertCircle aria-hidden size={18} /> Problème signalé</p>
            <p className="text-ink">{mission.openIncident?.decision ? DECISION[mission.openIncident.decision] : "En attente de la réponse de votre gérant."}</p>
            {mission.openIncident?.message && <p className="text-ink-muted">« {mission.openIncident.message} »</p>}
          </section>
        )}

        <section className="flex flex-col gap-1 rounded-xl border border-line bg-surface-raised p-[18px]">
          <p className="flex gap-2.5 font-semibold"><MapPin aria-hidden size={18} className="mt-0.5 flex-none" />{mission.address}</p>
          {mission.accessInfo && <p className="pl-7 text-[15px] text-ink-muted">{mission.accessInfo}</p>}
          {mission.teammates.length > 0 && <p className="pl-7 text-[15px] text-ink-muted">Avec {mission.teammates.join(", ")}</p>}
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-md border border-line-strong font-semibold text-ink">
            <Navigation aria-hidden size={16} /> Itinéraire
          </a>
        </section>

        {mission.instructions && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-soleil-soft p-[18px]">
            <p className="text-[13px] font-semibold tracking-[0.06em] text-soleil-ink">CONSIGNES</p>
            <p className="whitespace-pre-line">{mission.instructions}</p>
          </section>
        )}

        {(working || blocked) && (
          <>
            {(mission.photosRequired || before + after > 0) && (
              <div className="grid grid-cols-2 gap-2.5">
                <PhotoCapture companyId={mission.companyId} jobId={mission.id} label="Photos avant" sublabel={plural(before, "photo")} onUploaded={onAvant} />
                <PhotoCapture companyId={mission.companyId} jobId={mission.id} label="Photos après" sublabel={plural(after, "photo")} onUploaded={onApres} />
              </div>
            )}
            {mission.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mission.photos.map((p) =>
                  p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.id} src={p.url} alt={`Photo ${p.kind}`} className="size-16 flex-none rounded-md object-cover" />
                  ) : null,
                )}
              </div>
            )}

            {items.length > 0 && (
              <section className="flex flex-col rounded-xl border border-line bg-surface-raised px-4 py-2">
                <div className="flex items-center justify-between py-2.5">
                  <p className="font-semibold">Checklist</p>
                  <span className="text-sm text-ink-muted">{done} sur {items.length}</span>
                </div>
                {items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="checkbox"
                    aria-checked={c.done}
                    disabled={!working}
                    onClick={() =>
                      start(async () => {
                        toggleOptimistic({ id: c.id, done: !c.done });
                        const res = await setChecklistItem(mission.id, c.id, !c.done);
                        if (res.error) setError(res.error);
                        router.refresh();
                      })
                    }
                    className="flex min-h-[50px] items-center gap-3.5 border-t border-hairline text-left"
                  >
                    <span aria-hidden className={`flex size-[26px] flex-none items-center justify-center rounded-full ${c.done ? "bg-valide text-on-ink" : "border-2 border-line-strong"}`}>
                      {c.done && <Check size={13} strokeWidth={3.5} />}
                    </span>
                    <span className={c.done ? "text-ink-muted" : ""}>{c.label}</span>
                  </button>
                ))}
              </section>
            )}

            {working && (
              <div>
                <label htmlFor="comment" className="mb-2 block text-sm text-ink-muted">Note pour votre gérant (facultatif)</label>
                <textarea id="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border border-line-strong bg-surface-raised px-3.5 py-3 text-base text-ink" />
              </div>
            )}
          </>
        )}
      </main>

      <div className="sticky bottom-0 flex gap-2.5 bg-surface px-5 pt-2.5 pb-7">
        {canStart && (
          <button type="button" disabled={pending} onClick={() => run(() => startJob(mission.id))} className="h-[58px] flex-1 rounded-lg bg-azur text-lg font-semibold text-on-azur shadow-card disabled:opacity-60">
            {pending ? "…" : mission.status === "a_reprendre" ? "Démarrer la reprise" : "Démarrer"}
          </button>
        )}
        {(working || blocked) && (
          <Link href={`/agent/mission/${mission.id}/signaler`} aria-label="Signaler un problème" className="flex size-[58px] flex-none items-center justify-center rounded-lg border border-critique/30 bg-surface-raised text-critique">
            <AlertCircle aria-hidden size={22} />
          </Link>
        )}
        {working && (
          <button type="button" disabled={pending} onClick={() => run(() => finishJob(mission.id, comment))} className="h-[58px] flex-1 rounded-lg bg-azur text-lg font-semibold text-on-azur disabled:opacity-60">
            {pending ? "…" : "Terminer"}
          </button>
        )}
      </div>
    </>
  );
}
