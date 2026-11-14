"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { saveMyAvatar } from "@/app/profile-actions";
import { browserClient } from "@/lib/supabase/client";
import { isDemo } from "@/lib/env";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";

/** Photo carrée de 512 px, recadrée au centre, en JPEG. */
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("conversion");
  return blob;
}

/** Changer ou retirer sa photo de profil. Elle remplace les initiales partout (équipe, planning, chantiers). */
export function AvatarUpload({ companyId, member }: { companyId: string; member: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (isDemo) return setError("Mode démonstration : rien n'est enregistré.");
    await run(async () => {
      setError(null);
      try {
        const blob = await squarePhoto(file);
        const path = `${companyId}/${member.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await browserClient().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const res = await saveMyAvatar(path);
        if (res.error) setError(res.error);
      } catch {
        setError("Cette photo n'a pas pu être ajoutée. Essayez avec une autre image (JPEG ou PNG).");
      }
    });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar {...member} size={84} />
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !ready}
            onClick={() => input.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3.5 text-sm font-semibold text-ink hover:bg-hairline disabled:opacity-60"
          >
            <Camera aria-hidden size={16} /> {pending ? "Envoi…" : member.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {member.avatarUrl && (
            <button
              type="button"
              disabled={pending || !ready}
              onClick={() => run(async () => { const r = await saveMyAvatar(null); if (r.error) setError(r.error); })}
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-ink disabled:opacity-60"
            >
              <Trash2 aria-hidden size={15} /> Retirer
            </button>
          )}
        </div>
        <p className="text-[13px] text-ink-muted">Visible par votre équipe, à la place de vos initiales.</p>
        {error && <p role="alert" className="text-sm font-semibold text-critique">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void onPick(e.target.files?.[0])} />
    </div>
  );
}
