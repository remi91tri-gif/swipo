"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { isDemo } from "@/lib/env";

/** Réduit la photo sur le téléphone (1600 px, JPEG) avant l'envoi : moins de données, envoi plus rapide. */
export async function compress(file: File): Promise<Blob> {
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

/**
 * Bouton « Photos » : ouvre l'appareil photo et rend les photos réduites. L'envoi est fait
 * par la file d'attente, qui les garde sur le téléphone tant qu'il n'y a pas de réseau.
 */
export function PhotoCapture({ label, sublabel, onCapture }: { label: string; sublabel: string; onCapture: (blobs: Blob[]) => void | Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    if (isDemo) {
      setError("Mode démonstration : les photos ne sont pas envoyées.");
      return;
    }
    if (files.length) await onCapture(await Promise.all(files.map(compress)));
  }

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
          <span className="block text-sm text-ink-muted">{sublabel}</span>
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={onPick} />
      {error && <p role="alert" className="text-sm text-critique">{error}</p>}
    </div>
  );
}
