"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMyAccount, deleteMyCompany } from "@/app/account-actions";
import { FormError } from "@/components/ui";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";

async function forgetDevice() {
  try {
    navigator.serviceWorker?.controller?.postMessage("effacer");
    const { clearAll } = await import("@/lib/offline/queue");
    await clearAll();
  } catch {}
}

const danger = "flex h-11 items-center justify-center gap-2 rounded-md bg-critique px-[18px] font-semibold text-white disabled:opacity-50";

/** Gérant : supprimer l'entreprise et tout ce qu'elle contient, après avoir retapé son nom. */
export function DeleteCompany({ companyName, paying }: { companyName: string; paying: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  const match = name.trim().toLowerCase() === companyName.trim().toLowerCase();

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-ink-muted">
          Supprime définitivement votre compte, votre entreprise, vos chantiers, photos, clients et les accès de votre équipe.
          {paying ? " Votre abonnement est arrêté immédiatement, sans nouveau prélèvement." : " Aucun paiement n'est nécessaire pour supprimer votre compte."}
        </p>
        <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-md px-1 text-sm font-semibold text-critique hover:underline">
          Supprimer mon compte et mon entreprise
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-critique/30 bg-critique-soft p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!match) return;
        void run(async () => {
          setError(null);
          const res = await deleteMyCompany(name);
          if (res.error) setError(res.error);
          else {
            await forgetDevice();
            window.location.assign(res.url ?? "/");
          }
        });
      }}
    >
      <p className="font-semibold text-critique">Suppression définitive</p>
      <p className="text-sm text-ink">
        Tout sera effacé et ne pourra pas être récupéré. Pensez à télécharger les comptes rendus dont vous avez besoin avant de continuer.
      </p>
      <label htmlFor="del-name" className="text-sm text-ink">
        Pour confirmer, tapez le nom de votre entreprise : <strong>{companyName}</strong>
      </label>
      <input
        id="del-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
        className="h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink"
      />
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setOpen(false); setName(""); setError(null); }} className="h-11 rounded-md border border-line-strong bg-surface-raised px-[18px] font-semibold text-ink">
          Annuler
        </button>
        <button type="submit" disabled={!match || pending || !ready} className={danger}>
          <Trash2 aria-hidden size={16} /> {pending ? "Suppression…" : "Tout supprimer"}
        </button>
      </div>
    </form>
  );
}

/** Agent ou chef d'équipe : supprimer son propre compte. */
export function DeleteMyAccount() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-semibold text-critique hover:underline">
        Supprimer mon compte
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-critique/30 bg-critique-soft p-4">
      <p className="font-semibold text-critique">Supprimer votre compte ?</p>
      <p className="text-sm text-ink">Votre accès et votre photo sont effacés. Les chantiers déjà faits restent dans l&apos;historique de l&apos;entreprise.</p>
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-md border border-line-strong bg-surface-raised px-[18px] font-semibold text-ink">Annuler</button>
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() =>
            void run(async () => {
              setError(null);
              const res = await deleteMyAccount();
              if (res.error) setError(res.error);
              else {
                await forgetDevice();
                window.location.assign(res.url ?? "/");
              }
            })
          }
          className={danger}
        >
          <Trash2 aria-hidden size={16} /> {pending ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
