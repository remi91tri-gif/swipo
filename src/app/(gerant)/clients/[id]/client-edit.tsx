"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { CLIENT_TYPE_LABEL, displayPhone } from "@/lib/format";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";
import type { Client, Site } from "@/lib/types";
import { updateClientAction, updateSiteAction } from "../actions";

const input = "h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink";
const label = "mb-1.5 block text-sm text-ink-muted";

/** Bouton « Modifier » + formulaire des coordonnées du client. */
export function EditClient({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: client.name,
    type: client.type as string,
    contactName: client.contactName ?? "",
    phone: client.phone ? displayPhone(client.phone) : "",
    email: client.email ?? "",
    notes: client.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }));

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden size={15} /> Modifier
      </Button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10" role="dialog" aria-label="Modifier le client">
      <form
        className="panel-in flex w-full max-w-[560px] flex-col gap-4 rounded-2xl bg-surface-raised p-7 shadow-hero"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setError(null);
            const res = await updateClientAction(client.id, f);
            if (res.error) setError(res.error);
            else {
              setOpen(false);
              window.location.reload();
            }
          });
        }}
      >
        <p className="font-display text-xl font-semibold">Modifier le client</p>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label htmlFor="c-nom" className={label}>Nom</label><input id="c-nom" value={f.name} onChange={set("name")} required className={input} /></div>
          <div>
            <label htmlFor="c-type" className={label}>Type</label>
            <select id="c-type" value={f.type} onChange={set("type")} className={input}>
              {Object.entries(CLIENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label htmlFor="c-contact" className={label}>Contact (facultatif)</label><input id="c-contact" value={f.contactName} onChange={set("contactName")} className={input} /></div>
          <div><label htmlFor="c-tel" className={label}>Téléphone</label><input id="c-tel" type="tel" value={f.phone} onChange={set("phone")} className={input} /></div>
          <div><label htmlFor="c-mail" className={label}>E-mail</label><input id="c-mail" type="email" value={f.email} onChange={set("email")} className={input} /></div>
          <div className="sm:col-span-2">
            <label htmlFor="c-notes" className={label}>Notes internes</label>
            <textarea id="c-notes" rows={3} value={f.notes} onChange={set("notes")} className="w-full rounded-lg border border-line-strong bg-surface-raised px-3.5 py-3 text-[15px] text-ink" />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
          <Button type="submit" disabled={pending || !ready}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </form>
    </div>
  );
}

/** Une adresse du client, avec sa modification sur place. */
export function SiteItem({ clientId, site }: { clientId: string; site: Site }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ label: site.label ?? "", address: site.address, accessInfo: site.accessInfo ?? "", onsiteContact: site.onsiteContact ?? "" });
  const [shown, setShown] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }));
  const id = (k: string) => `${k}-${site.id}`;

  if (!editing) {
    return (
      <div className="group flex gap-3">
        <MapPin aria-hidden size={17} className="mt-0.5 flex-none text-ink-muted" />
        <span className="min-w-0 flex-1">
          {shown.label && <span className="block font-semibold">{shown.label}</span>}
          <span className="block">{shown.address}</span>
          {shown.accessInfo && <span className="block text-sm text-ink-muted">{shown.accessInfo}</span>}
          {shown.onsiteContact && <span className="block text-sm text-ink-muted">Sur place : {shown.onsiteContact}</span>}
        </span>
        <button type="button" onClick={() => setEditing(true)} aria-label={`Modifier l'adresse ${shown.address}`} className="flex size-8 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-hairline hover:text-ink">
          <Pencil aria-hidden size={14} />
        </button>
      </div>
    );
  }
  return (
    <form
      aria-label="Modifier l'adresse"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          const res = await updateSiteAction(clientId, site.id, f);
          if (res.error) setError(res.error);
          else {
            setShown({ ...site, label: f.label || null, address: f.address, accessInfo: f.accessInfo || null, onsiteContact: f.onsiteContact || null });
            setEditing(false);
          }
        });
      }}
    >
      <FormError message={error} />
      <div><label htmlFor={id("adresse")} className={label}>Adresse</label><input id={id("adresse")} value={f.address} onChange={set("address")} required className={input} /></div>
      <div><label htmlFor={id("nom")} className={label}>Nom du lieu (facultatif)</label><input id={id("nom")} value={f.label} onChange={set("label")} placeholder="Agence, appartement 3B…" className={input} /></div>
      <div><label htmlFor={id("acces")} className={label}>Accès</label><input id={id("acces")} value={f.accessInfo} onChange={set("accessInfo")} placeholder="Code, clés, étage…" className={input} /></div>
      <div><label htmlFor={id("contact")} className={label}>Contact sur place</label><input id={id("contact")} value={f.onsiteContact} onChange={set("onsiteContact")} className={input} /></div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Annuler</Button>
        <Button type="submit" disabled={pending || !ready}>{pending ? "…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}
