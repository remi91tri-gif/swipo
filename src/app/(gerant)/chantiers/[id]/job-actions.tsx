"use client";

import { useState, useTransition } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { AlertCircle, Check, RotateCcw } from "lucide-react";
import { Button, Card, FormError } from "@/components/ui";
import type { IncidentDecision, JobDetail, JobIncident } from "@/lib/types";
import { decideIncident, requestRework, validateJobs } from "./actions";

const CATEGORY: Record<string, string> = {
  acces_impossible: "Accès impossible",
  materiel_manquant: "Produit ou matériel manquant",
  travail_supplementaire: "Travail en plus demandé",
  etat_different: "Différent des consignes",
  degat: "Dégât ou casse",
  retard: "Retard",
  autre: "Autre problème",
};

const DECISIONS: { id: IncidentDecision; label: string; sub: string; tone: "primary" | "plain" | "danger" }[] = [
  { id: "continuer", label: "Continuer", sub: "L'agent reprend le travail", tone: "primary" },
  { id: "attendre", label: "Attendre", sub: "Il patiente avec votre message", tone: "plain" },
  { id: "reprogrammer", label: "Reprogrammer", sub: "Le chantier repasse au planning", tone: "plain" },
  { id: "ne_pas_effectuer", label: "Ne pas effectuer", sub: "Le chantier est annulé", tone: "danger" },
];

// Pas de router.refresh() ici : l'action rafraîchit déjà la page (revalidatePath), et un second
// rechargement simultané annule le premier, ce qui laisse le bouton bloqué sur « en cours ».
function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ready = useHydrated();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });
  return { pending, ready, error, run };
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

/** Décision du gérant sur un imprévu en attente. */
function DecisionPanel({ jobId, incident, agentName }: { jobId: string; incident: JobIncident; agentName: string }) {
  const { pending, ready, error, run } = useAction();
  const [message, setMessage] = useState("");
  return (
    <Card className="flex flex-col gap-5 border-critique/30 p-7">
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex size-11 flex-none items-center justify-center rounded-full bg-critique-soft text-critique">
          <AlertCircle size={20} strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold tracking-[0.06em] text-critique">IMPRÉVU BLOQUANT · {clock(incident.reportedAt)}</p>
          <p className="font-display text-xl font-semibold tracking-[-0.01em]">{CATEGORY[incident.category] ?? "Problème signalé"}</p>
          {incident.comment && <p className="text-base">« {incident.comment} »</p>}
          {incident.reportedBy && <p className="text-sm text-ink-muted">Signalé par {incident.reportedBy}</p>}
        </div>
      </div>
      <FormError message={error} />
      <div>
        <label htmlFor="decision-message" className="mb-2 block text-sm text-ink-muted">Message pour {agentName}</label>
        <textarea
          id="decision-message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="J'appelle le client, attendez 10 minutes."
          className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] text-ink"
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {DECISIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={pending || !ready}
            onClick={() => run(() => decideIncident(jobId, incident.id, d.id, message))}
            className={`flex flex-col items-start gap-1 rounded-xl border px-[18px] py-4 text-left disabled:opacity-60 ${
              d.tone === "primary" ? "border-azur bg-azur text-on-azur" : d.tone === "danger" ? "border-line-strong bg-surface-raised text-critique" : "border-line-strong bg-surface-raised text-ink"
            }`}
          >
            <span className="text-base font-semibold">{d.label}</span>
            <span className={`text-[13px] leading-[18px] ${d.tone === "primary" ? "opacity-85" : "text-ink-muted"}`}>{d.sub}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-muted">{agentName} voit votre décision sur sa mission dès qu&apos;il l&apos;ouvre ou la rafraîchit.</p>
    </Card>
  );
}

/** Contrôle d'un chantier terminé : valider ou demander une reprise. */
function ReviewPanel({ job }: { job: JobDetail }) {
  const { pending, ready, error, run } = useAction();
  const [rework, setRework] = useState(false);
  const [reason, setReason] = useState("");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState(job.startTime?.slice(0, 5) ?? "08:00");
  const who = job.team.map((t) => t.firstName).join(" et ") || "L'équipe";
  const photos = job.photos.filter((p) => p.kind !== "probleme").length;
  const done = job.checklist.filter((c) => c.done).length;

  if (rework) {
    return (
      <Card className="flex flex-col gap-[18px] p-7">
        <h2 className="font-display text-xl font-semibold tracking-[-0.01em]">Demander une reprise</h2>
        <FormError message={error} />
        <div>
          <label htmlFor="motif" className="mb-2 block text-sm text-ink-muted">Ce qui doit être refait</label>
          <textarea id="motif" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] text-ink" placeholder="Traces de calcaire sur la vitrine côté quai…" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="rework-date" className="mb-2 block text-sm text-ink-muted">Quand</label>
            <input id="rework-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink" />
          </div>
          <div className="min-w-[120px] flex-1">
            <label htmlFor="rework-time" className="mb-2 block text-sm text-ink-muted">Heure</label>
            <input id="rework-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className="h-12 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink" />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" type="button" onClick={() => setRework(false)}>Annuler</Button>
          <Button variant="strong" type="button" disabled={pending || !ready} onClick={() => run(() => requestRework(job.id, reason, date, time))}>
            {pending ? "Envoi…" : `Envoyer à ${who}`}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-wrap items-center gap-x-5 gap-y-4 px-6 py-5">
      <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-valide-soft text-valide"><Check size={18} strokeWidth={2.25} /></span>
      <span className="min-w-0 flex-[1_1_260px]">
        <span className="block text-base font-semibold">{who} a terminé{job.finishedAt ? ` à ${clock(job.finishedAt)}` : ""}</span>
        <span className="block text-ink-muted">
          {photos} photo{photos > 1 ? "s" : ""}
          {job.checklist.length ? ` · checklist ${done} sur ${job.checklist.length}` : ""}
          {" · la vérification est facultative"}
        </span>
      </span>
      {error && <FormError message={error} />}
      <span className="flex flex-wrap gap-2.5">
        <Button variant="secondary" type="button" onClick={() => setRework(true)}>
          <RotateCcw aria-hidden size={16} /> Demander une reprise
        </Button>
        <Button type="button" disabled={pending || !ready} onClick={() => run(() => validateJobs([job.id]))}>
          {pending ? "…" : "Valider"}
        </Button>
      </span>
    </Card>
  );
}

export function JobActions({ job }: { job: JobDetail }) {
  const open = job.incidents.find((i) => i.urgency === "bloquant" && !i.decision);
  if (job.status === "a_traiter" && open) {
    return <DecisionPanel jobId={job.id} incident={open} agentName={open.reportedBy ?? "L'agent"} />;
  }
  if (job.status === "termine") return <ReviewPanel job={job} />;
  if (job.status === "a_reprendre" && job.reworkReason) {
    return (
      <Card className="flex items-start gap-4 border-reprise/30 px-6 py-5">
        <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-reprise-soft text-reprise"><RotateCcw size={18} /></span>
        <span>
          <span className="block text-base font-semibold">Reprise demandée</span>
          <span className="block text-ink-muted">« {job.reworkReason} »</span>
        </span>
      </Card>
    );
  }
  return null;
}

/** « Tout valider » sur l'onglet À vérifier de la liste des chantiers. */
export function ValidateAll({ ids }: { ids: string[] }) {
  const { pending, ready, error, run } = useAction();
  if (ids.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" disabled={pending || !ready} onClick={() => run(() => validateJobs(ids))}>
        <Check aria-hidden size={16} /> {pending ? "Validation…" : `Tout valider (${ids.length})`}
      </Button>
      {error && <FormError message={error} />}
    </div>
  );
}
