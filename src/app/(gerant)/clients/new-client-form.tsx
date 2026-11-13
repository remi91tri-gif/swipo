"use client";

import { useActionState } from "react";
import { Button, Field, FormError } from "@/components/ui";
import { CLIENT_TYPE_LABEL } from "@/lib/format";
import { createClientAction } from "./actions";

export function NewClientForm() {
  const [state, action, pending] = useActionState(createClientAction, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
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
      <Field id="address" name="address" label="Adresse d'intervention" required defaultValue={f.address} autoComplete="street-address" />
      <Field id="access" name="access" label="Accès (facultatif)" placeholder="Code, clés, étage…" defaultValue={f.access} />
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Ajouter le client"}</Button>
    </form>
  );
}
