"use client";

import { AddressFields } from "@/components/address-fields";

import { useState } from "react";
import { Button, Field, FormError } from "@/components/ui";
import { CLIENT_TYPE_LABEL } from "@/lib/format";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";
import { createClientAction, type ClientFormState } from "./actions";

export function NewClientForm() {
  const [state, setState] = useState<ClientFormState>();
  const [pending, run] = usePending();
  const ready = useHydrated();
  const f = state?.fields ?? {};
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void run(async () => {
          const res = await createClientAction(undefined, fd);
          // La fiche du client s'ouvre ici (une redirection depuis l'action pouvait bloquer le bouton).
          if (res?.url) window.location.assign(res.url);
          else setState(res);
        });
      }}
    >
      <FormError message={state?.error} />
      <Field id="name" name="name" label="Nom" required defaultValue={f.name} placeholder="Mme Rossi, Boulangerie du Port…" />
      <div className="flex flex-col gap-2">
        <label htmlFor="type" className="text-sm text-ink-muted">Type</label>
        <select id="type" name="type" defaultValue={f.type || "particulier"} className="h-12 rounded-md border border-line-strong bg-surface-raised px-3 text-[15px] text-ink">
          {Object.entries(CLIENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Field id="phone" name="phone" type="tel" inputMode="tel" label="Téléphone (facultatif)" defaultValue={f.phone} />
      <Field id="email" name="email" type="email" label="E-mail (facultatif)" defaultValue={f.email} />
      <AddressFields label="Adresse d'intervention" defaultValue={{ street: f.street, postalCode: f.postal_code, city: f.city }} />
      <Field id="access" name="access" label="Accès (facultatif)" placeholder="Code, clés, étage…" defaultValue={f.access} />
      <Button type="submit" disabled={pending || !ready}>{pending ? "Enregistrement…" : "Ajouter le client"}</Button>
    </form>
  );
}
