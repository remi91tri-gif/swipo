"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { PhotoCapture } from "@/components/photo-capture";
import { enqueue } from "@/lib/offline/queue";
import { useSyncState } from "@/lib/offline/sync";

const CATEGORIES = [
  ["acces_impossible", "Accès impossible"],
  ["materiel_manquant", "Produit ou matériel manquant"],
  ["travail_supplementaire", "Travail en plus demandé"],
  ["etat_different", "Différent des consignes"],
  ["degat", "Dégât ou casse"],
  ["retard", "Retard"],
] as const;

export function ReportForm({ jobId, companyId, title }: { jobId: string; companyId: string; title: string }) {
  const [category, setCategory] = useState<string>("acces_impossible");
  const [blocking, setBlocking] = useState(true);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const { online } = useSyncState();

  // Le signalement est gardé sur le téléphone puis envoyé : il part même sans réseau.
  async function send() {
    setError(null);
    setPending(true);
    try {
      await enqueue({
        kind: "incident",
        jobId,
        category,
        urgency: blocking ? "bloquant" : "information",
        comment,
        photo: photo ? { path: `${companyId}/${jobId}/${crypto.randomUUID()}.jpg`, blob: photo } : undefined,
      });
      setSent(true);
    } catch {
      setError("Le signalement n'a pas pu être enregistré sur le téléphone. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  const header = (
    <header className="flex items-center gap-2 px-4 pt-4 pb-2">
      <Link href={`/agent/mission/${jobId}`} aria-label="Retour à la mission" className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-surface-raised text-ink">
        <ChevronLeft aria-hidden size={20} />
      </Link>
      <span className="flex-1 truncate text-center text-sm font-semibold text-ink-muted">{title}</span>
      <span className="w-11" />
    </header>
  );

  if (sent) {
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 pb-10 text-center">
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-azur-subtle text-azur"><Check size={36} strokeWidth={2.25} /></span>
          <h1 className="mt-2 font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">{online ? "Envoyé" : "Enregistré"}</h1>
          <p className="text-ink-muted">
            {online
              ? "Votre gérant est prévenu. Sa réponse s'affichera sur la mission."
              : "Pas de réseau : votre gérant sera prévenu dès le retour du réseau. Sa réponse s'affichera sur la mission."}
          </p>
          <Link href={`/agent/mission/${jobId}`} className="mt-4 flex h-[58px] w-full items-center justify-center rounded-lg bg-azur text-[17px] font-semibold text-on-azur">Revenir à la mission</Link>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-4 text-base">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Que se passe-t-il ?</h1>
        {error && <p role="alert" className="rounded-lg bg-critique-soft px-4 py-3 font-semibold text-critique">{error}</p>}
        <fieldset>
          <legend className="sr-only">Type de problème</legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
                className="min-h-[60px] rounded-lg border-[1.5px] border-line bg-surface-raised px-3.5 py-2.5 text-left text-[15px] leading-5 font-semibold text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <PhotoCapture label="Photo" sublabel={photo ? "Photo ajoutée" : "Toucher pour en prendre une"} onCapture={(blobs) => setPhoto(blobs[0] ?? null)} />
        <div>
          <label htmlFor="detail" className="mb-2 block text-sm text-ink-muted">En quelques mots</label>
          <textarea id="detail" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border border-line-strong bg-surface-raised px-3.5 py-3 text-base text-ink" />
        </div>
        <div role="radiogroup" aria-label="Pouvez-vous continuer ?" className="flex rounded-[14px] bg-hairline p-1">
          {[
            [false, "Je continue"],
            [true, "Je suis bloqué"],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={blocking === value}
              onClick={() => setBlocking(value as boolean)}
              className="h-11 flex-1 rounded-[11px] text-[15px] font-semibold text-ink aria-checked:bg-surface-raised aria-checked:shadow-[0_1px_3px_#0000002e] aria-checked:last:text-critique"
            >
              {label as string}
            </button>
          ))}
        </div>
      </main>
      <div className="sticky bottom-0 bg-surface px-5 pt-2.5 pb-7">
        <button type="button" disabled={pending} onClick={send} className="h-[58px] w-full rounded-lg bg-ink text-lg font-semibold text-on-ink disabled:opacity-60">
          {pending ? "Envoi…" : "Envoyer à mon gérant"}
        </button>
      </div>
    </>
  );
}
