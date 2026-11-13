"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { isDemo } from "@/lib/env";

/** Réduit la photo sur le téléphone (1600 px, JPEG) avant l'envoi : moins de données, envoi plus rapide. */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

type Pending = { id: string; blob: Blob; path: string; tries: number };

/**
 * Bouton « Prendre une photo » : ouvre l'appareil photo, dépose la photo dans le stockage
 * privé puis prévient le serveur. En cas de réseau faible, réessaie tant que la page est ouverte.
 */
export function PhotoCapture({
  companyId,
  jobId,
  label,
  sublabel,
  onUploaded,
}: {
  companyId: string;
  jobId: string;
  label: string;
  sublabel: string;
  onUploaded: (path: string) => Promise<{ error?: string }>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const pendingRef = useRef<Pending[]>([]);

  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (const p of [...pendingRef.current]) {
        const { error: upErr } = await browserClient().storage.from("photos").upload(p.path, p.blob, { contentType: "image/jpeg", upsert: false });
        if (upErr && !/exists/i.test(upErr.message)) {
          p.tries += 1;
          continue;
        }
        const res = await onUploaded(p.path);
        if (res.error) {
          setError(res.error);
          p.tries += 1;
          continue;
        }
        setPending((cur) => cur.filter((x) => x.id !== p.id));
      }
    } finally {
      busy.current = false;
    }
  }, [onUploaded]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (pending.length === 0) return;
    const t = setInterval(flush, 5000);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", flush);
    };
  }, [pending.length, flush]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    if (isDemo) {
      setError("Mode démonstration : les photos ne sont pas envoyées.");
      return;
    }
    const items: Pending[] = [];
    for (const f of files) {
      const id = crypto.randomUUID();
      items.push({ id, blob: await compress(f), path: `${companyId}/${jobId}/${id}.jpg`, tries: 0 });
    }
    pendingRef.current = [...pendingRef.current, ...items];
    setPending((cur) => [...cur, ...items]);
    await flush();
  }

  const waiting = pending.length;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex w-full flex-col items-start gap-2.5 rounded-xl border border-line bg-surface-raised p-4 text-left text-ink"
      >
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-azur-subtle text-azur">
          <Camera size={18} strokeWidth={1.75} />
        </span>
        <span>
          <span className="block font-semibold">{label}</span>
          <span className="block text-sm text-ink-muted">{waiting ? `Envoi en cours… (${waiting})` : sublabel}</span>
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={onPick} />
      {error && <p role="alert" className="text-sm text-critique">{error}</p>}
    </div>
  );
}
