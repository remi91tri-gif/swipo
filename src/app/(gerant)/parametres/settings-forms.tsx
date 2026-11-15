"use client";

import { useState } from "react";
import { Button, FormError } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";
import { updateMember } from "../equipe/actions";
import { changePassword, setCancelAtPeriodEnd, updateCompany } from "./actions";
import type { Member } from "@/lib/types";

const input = "h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink";
const label = "mb-1.5 block text-sm text-ink-muted";

function Saved({ text }: { text: string | null }) {
  return text ? <p role="status" className="rounded-md bg-valide-soft px-4 py-2.5 text-sm font-semibold text-valide">{text}</p> : null;
}

export function ProfileForm({ member, canEdit }: { member: Member; canEdit: boolean }) {
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [phone, setPhone] = useState(member.phone ? member.phone.replace(/^\+33/, "0").replace(/(\d{2})(?=\d)/g, "$1 ") : "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          setOk(null);
          const res = await updateMember(member.id, { firstName, lastName, phone, role: member.role });
          if (res.error) setError(res.error);
          else setOk("Profil enregistré.");
        });
      }}
    >
      <FormError message={error} />
      <Saved text={ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="p-prenom" className={label}>Prénom</label><input id="p-prenom" value={firstName} disabled={!canEdit} onChange={(e) => setFirstName(e.target.value)} required className={input} /></div>
        <div><label htmlFor="p-nom" className={label}>Nom</label><input id="p-nom" value={lastName} disabled={!canEdit} onChange={(e) => setLastName(e.target.value)} className={input} /></div>
        <div><label htmlFor="p-portable" className={label}>Portable</label><input id="p-portable" type="tel" value={phone} disabled={!canEdit} onChange={(e) => setPhone(e.target.value)} placeholder="Facultatif" className={input} /></div>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !ready}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      )}
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  if (!hasPassword) return <p className="text-ink-muted">Vous êtes connecté par un lien personnel : ce compte n&apos;a pas de mot de passe.</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          setOk(null);
          const res = await changePassword(current, next, confirm);
          if (res.error) setError(res.error);
          else {
            setOk(res.ok ?? "Mot de passe changé.");
            setCurrent("");
            setNext("");
            setConfirm("");
          }
        });
      }}
    >
      <FormError message={error} />
      <Saved text={ok} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label htmlFor="mdp-actuel" className={label}>Mot de passe actuel</label><PasswordInput id="mdp-actuel" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={input} /></div>
        <div><label htmlFor="mdp-nouveau" className={label}>Nouveau mot de passe</label><PasswordInput id="mdp-nouveau" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required className={input} /></div>
        <div><label htmlFor="mdp-confirmation" className={label}>Confirmer le nouveau</label><PasswordInput id="mdp-confirmation" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={input} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">Au moins 8 caractères.</p>
        <Button type="submit" disabled={pending || !ready}>{pending ? "Modification…" : "Changer le mot de passe"}</Button>
      </div>
    </form>
  );
}

export function CompanyForm({ company }: { company: { name: string; phone: string | null; address: string | null; siret: string | null } }) {
  const [name, setName] = useState(company.name);
  const [phone, setPhone] = useState(company.phone ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [siret, setSiret] = useState(company.siret ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          setOk(null);
          const res = await updateCompany({ name, phone, address, siret });
          if (res.error) setError(res.error);
          else setOk(res.ok ?? null);
        });
      }}
    >
      <FormError message={error} />
      <Saved text={ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="e-nom" className={label}>Nom de l&apos;entreprise</label><input id="e-nom" value={name} onChange={(e) => setName(e.target.value)} required className={input} /></div>
        <div><label htmlFor="e-tel" className={label}>Téléphone</label><input id="e-tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} /></div>
        <div><label htmlFor="e-adresse" className={label}>Adresse</label><input id="e-adresse" value={address} onChange={(e) => setAddress(e.target.value)} className={input} /></div>
        <div><label htmlFor="e-siret" className={label}>SIRET</label><input id="e-siret" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} className={input} /></div>
      </div>
      <p className="text-[13px] text-ink-muted">Ces informations apparaissent sur vos comptes rendus clients.</p>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !ready}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}

export function CancelSubscription({
  planLabel,
  cancelled: initial,
  periodEnd,
  canChange,
}: {
  planLabel: string;
  cancelled: boolean;
  periodEnd: string;
  canChange: boolean;
}) {
  // État tenu ici : l'écran change tout de suite, sans attendre le rechargement de la page.
  const [cancelled, setCancelled] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  const act = (cancel: boolean) =>
    run(async () => {
      setError(null);
      const res = await setCancelAtPeriodEnd(cancel);
      if (res.error) setError(res.error);
      else {
        setOk(res.ok ?? null);
        setConfirming(false);
        setCancelled(cancel);
      }
    });

  return (
    <div className="flex flex-col items-start gap-3">
      <p>
        <strong>{planLabel}</strong>.{" "}
        {cancelled ? `Résilié : l'accès reste ouvert jusqu'au ${periodEnd}, sans autre prélèvement.` : `Prochain renouvellement le ${periodEnd}.`}
      </p>
      <FormError message={error} />
      <Saved text={ok} />
      {!canChange ? null : cancelled ? (
        <Button type="button" disabled={pending || !ready} onClick={() => void act(false)}>{pending ? "…" : "Reprendre mon abonnement"}</Button>
      ) : confirming ? (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-critique/30 bg-critique-soft p-4">
          <p className="font-semibold text-critique">Résilier l&apos;abonnement ?</p>
          <p className="text-sm text-ink">
            Vous gardez l&apos;accès jusqu&apos;au {periodEnd}, sans autre prélèvement. Vos données sont conservées 90 jours : vous pourrez reprendre à tout moment.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>Garder mon abonnement</Button>
            <button type="button" disabled={pending || !ready} onClick={() => void act(true)} className="h-11 rounded-md bg-critique px-[18px] font-semibold text-white disabled:opacity-60">
              {pending ? "Résiliation…" : "Confirmer la résiliation"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="h-10 rounded-md px-1 text-sm font-semibold text-critique hover:underline">
          Résilier mon abonnement
        </button>
      )}
    </div>
  );
}
