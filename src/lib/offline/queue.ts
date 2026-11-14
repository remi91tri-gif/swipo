/**
 * File d'attente hors connexion de l'agent.
 *
 * Chaque geste (démarrer, cocher, photo, terminer, signaler) est d'abord écrit sur le téléphone
 * (IndexedDB, qui garde aussi les photos), puis envoyé dans l'ordre. Sans réseau, il attend :
 * l'écran l'affiche déjà comme fait, et l'envoi repart tout seul dès que le réseau revient.
 */

export type QueueItem =
  | { kind: "start"; jobId: string }
  | { kind: "check"; jobId: string; itemId: string; done: boolean }
  | { kind: "photo"; jobId: string; photoKind: "avant" | "apres"; path: string; blob: Blob }
  | { kind: "finish"; jobId: string; comment: string }
  | {
      kind: "incident";
      jobId: string;
      category: string;
      urgency: "bloquant" | "information";
      comment: string;
      photo?: { path: string; blob: Blob };
    };

/** `sent` : un envoi a déjà été tenté (il a pu aboutir même si la réponse s'est perdue). */
export type Queued = QueueItem & { id: string; seq: number; at: string; sent?: boolean };

const DB = "swipo-hors-connexion";
const STORE = "file";
const EVENT = "swipo-file";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

let counter = 0;

/** Enregistre un geste sur le téléphone et lance l'envoi. */
export async function enqueue(item: QueueItem): Promise<Queued> {
  const q: Queued = { ...item, id: crypto.randomUUID(), seq: Date.now() * 1000 + (counter++ % 1000), at: new Date().toISOString() };
  await tx("readwrite", (s) => s.put(q));
  notify();
  return q;
}

export async function list(jobId?: string): Promise<Queued[]> {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) as Queued[];
    return all.filter((q) => !jobId || q.jobId === jobId).sort((a, b) => a.seq - b.seq);
  } catch {
    return [];
  }
}

export async function markSent(q: Queued) {
  await tx("readwrite", (s) => s.put({ ...q, sent: true }));
}

export async function remove(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  notify();
}

export async function clearAll() {
  await tx("readwrite", (s) => s.clear());
  notify();
}

export function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onQueueChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
