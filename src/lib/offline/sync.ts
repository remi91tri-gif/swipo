"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { browserClient } from "@/lib/supabase/client";
import { finishJob, registerPhoto, reportIncident, setChecklistItem, startJob } from "@/app/(agent)/agent/mission/[id]/actions";
import { list, markSent, onQueueChange, remove, type Queued } from "./queue";

type Result = { error?: string };

export type SyncState = { online: boolean; pending: number; sending: boolean; failure: string | null; needsLogin: boolean };

let state: SyncState = { online: true, pending: 0, sending: false, failure: null, needsLogin: false };
const listeners = new Set<() => void>();
function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function dismissFailure() {
  set({ failure: null });
}

/** Erreur de réseau (et non refus de la base) : on réessaiera plus tard. */
class Offline extends Error {}

async function upload(path: string, blob: Blob) {
  const { error } = await browserClient().storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error && !/exist|duplicate/i.test(error.message)) throw new Offline(error.message);
}

/**
 * Un geste déjà tenté a peut-être abouti (réponse perdue en route) : on vérifie avant de le
 * renvoyer, pour ne jamais compter deux fois une photo ou un signalement.
 */
async function alreadyDone(q: Queued): Promise<boolean> {
  const sb = browserClient();
  if (q.kind === "photo") {
    const { data } = await sb.from("photos").select("id").eq("storage_path", q.path).limit(1);
    return !!data?.length;
  }
  if (q.kind === "incident") {
    const { data } = await sb.from("incidents").select("id").eq("job_id", q.jobId).eq("reported_at", q.at).limit(1);
    return !!data?.length;
  }
  if (q.kind === "finish" || q.kind === "start") {
    const { data } = await sb.from("jobs").select("status").eq("id", q.jobId).maybeSingle();
    const s = data?.status as string | undefined;
    return q.kind === "finish" ? s === "termine" || s === "valide" : !!s && s !== "planifie" && s !== "a_reprendre";
  }
  return false;
}

async function perform(q: Queued): Promise<Result> {
  if (q.sent && (await alreadyDone(q))) return {};
  await markSent(q);
  switch (q.kind) {
    case "start":
      return startJob(q.jobId, q.at);
    case "check":
      return setChecklistItem(q.jobId, q.itemId, q.done);
    case "photo":
      await upload(q.path, q.blob);
      return registerPhoto(q.jobId, q.photoKind, q.path);
    case "finish":
      return finishJob(q.jobId, q.comment, q.at);
    case "incident":
      if (q.photo) await upload(q.photo.path, q.photo.blob);
      return reportIncident(q.jobId, q.category, q.urgency, q.comment, q.photo?.path, q.at);
  }
}

/** Refus sans gravité : un coéquipier a déjà démarré le chantier, par exemple. */
function harmless(q: Queued, error: string) {
  return q.kind === "start" && /ne peut pas être démarré \(statut : (en_cours|a_traiter|termine)/.test(error);
}

const LABEL: Record<Queued["kind"], string> = {
  start: "Le démarrage n'a pas pu être enregistré",
  check: "Une case de la checklist n'a pas pu être enregistrée",
  photo: "Une photo n'a pas pu être enregistrée",
  finish: "La fin du chantier n'a pas pu être enregistrée",
  incident: "Le signalement n'a pas pu être enregistré",
};

let running = false;
let again = false;
const tries = new Map<string, number>();

/** Envoie les gestes en attente, dans l'ordre. S'arrête au premier problème de réseau. */
export async function syncQueue() {
  if (running) {
    again = true;
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    set({ online: false, pending: (await list()).length });
    return;
  }
  running = true;
  set({ sending: true });
  try {
    for (;;) {
      const [q] = await list();
      if (!q) break;
      let res: Result;
      try {
        // Filet de sécurité : une réponse qui n'arrive jamais ne doit pas bloquer la file.
        res = await Promise.race([
          perform(q),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("délai dépassé")), 45000)),
        ]);
      } catch (e) {
        console.warn("Swipo : envoi interrompu, nouvel essai plus tard", e);
        break; // pas de réseau : on garde tout, on réessaiera
      }
      if (!res.error) {
        tries.delete(q.id);
        set({ needsLogin: false });
        await remove(q.id);
        continue;
      }
      if (/Session expirée|Reconnectez/i.test(res.error)) {
        set({ needsLogin: true });
        break;
      }
      const n = (tries.get(q.id) ?? 0) + 1;
      tries.set(q.id, n);
      if (/Vérifiez votre connexion/.test(res.error) && n < 4) break; // erreur passagère
      if (!harmless(q, res.error)) set({ failure: `${LABEL[q.kind]} : ${res.error}` });
      tries.delete(q.id);
      await remove(q.id);
    }
  } finally {
    running = false;
    set({ sending: false, pending: (await list()).length });
  }
  if (again) {
    again = false;
    void syncQueue();
  }
}

/** Gestes en attente pour un chantier, mis à jour en direct. */
export function useQueued(jobId?: string) {
  const [items, setItems] = useState<Queued[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => list(jobId).then((l) => alive && setItems(l));
    load();
    const off = onQueueChange(load);
    return () => {
      alive = false;
      off();
    };
  }, [jobId]);
  return items;
}

/** Lance l'envoi au bon moment : retour du réseau, retour sur l'appli, et toutes les 20 s. */
export function useQueueRunner() {
  useEffect(() => {
    const goOnline = () => {
      set({ online: true });
      void syncQueue();
    };
    const goOffline = () => set({ online: false });
    const onVisible = () => document.visibilityState === "visible" && void syncQueue();
    set({ online: navigator.onLine });
    void syncQueue();
    const offQueue = onQueueChange(async () => {
      set({ pending: (await list()).length });
      void syncQueue();
    });
    const timer = setInterval(() => {
      if (state.pending > 0) void syncQueue();
    }, 20000);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      offQueue();
      clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
