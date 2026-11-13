"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormError } from "@/components/ui";
import { addSiteAction } from "../actions";

export function AddSiteForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addSiteAction.bind(null, clientId), undefined);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-semibold text-azur hover:text-azur-strong">
        + Ajouter une adresse
      </button>
    );
  }
  return (
    <form action={async (fd) => { await action(fd); }} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <FormError message={state?.error} />
      <Field id="label" name="label" label="Nom (facultatif)" placeholder="Bureaux, résidence secondaire…" />
      <Field id="address" name="address" label="Adresse" required />
      <Field id="access" name="access" label="Accès (facultatif)" />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </form>
  );
}
