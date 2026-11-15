"use client";

import { usePending } from "@/lib/use-pending";
import { useActionState, useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Check, Copy, Link2, Mail, MessageCircle, Pencil, Send, Smartphone, UserPlus } from "lucide-react";
import { Avatar, Button, Card, CardTitle, Field, FormError } from "@/components/ui";
import { ROLE_LABEL, displayPhone } from "@/lib/format";
import type { Member } from "@/lib/types";
import { addMember, createInviteLink, disconnectMember, inviteManager, setMemberActive, updateMember } from "./actions";

function inviteText(m: Member, companyName: string, link: string) {
  return `Bonjour ${m.firstName}, ${companyName} vous invite sur Swipo pour voir vos chantiers. Ouvrez ce lien sur votre téléphone pour vous connecter (valable 7 jours) : ${link}`;
}

/** Crée le lien de connexion de l'agent puis propose de l'envoyer par WhatsApp, SMS ou copier. */
function InviteActions({ member, origin, companyName, again }: { member: Member; origin: string; companyName: string; again?: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = usePending();
  const ready = useHydrated();
  const digits = (member.phone ?? "").replace(/\D/g, "");

  if (!link) {
    return (
      <span className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await createInviteLink(member.id);
              if (res.token) setLink(`${origin}/rejoindre/${res.token}`);
              else setError(res.error ?? "Réessayez.");
            })
          }
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:opacity-60 ${again ? "text-ink-muted hover:bg-hairline hover:text-ink" : "bg-azur text-on-azur hover:bg-azur-strong"}`}
        >
          <Link2 aria-hidden size={15} /> {pending ? "Création…" : again ? "Nouveau lien de connexion" : "Créer le lien de connexion"}
        </button>
        {error && <span className="text-sm text-critique">{error}</span>}
      </span>
    );
  }

  const message = inviteText(member, companyName, link);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez le message d'invitation :", message);
    }
  }
  return (
    <span className="flex flex-col items-start gap-2">
      <span className="flex flex-wrap gap-2">
        <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 text-sm font-semibold text-ink hover:bg-hairline">
          <MessageCircle aria-hidden size={15} /> WhatsApp
        </a>
        <a href={`sms:${member.phone}?&body=${encodeURIComponent(message)}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 text-sm font-semibold text-ink hover:bg-hairline">
          <Send aria-hidden size={15} /> SMS
        </a>
        <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-ink">
          {copied ? <Check aria-hidden size={15} /> : <Copy aria-hidden size={15} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </span>
      <span className="text-[13px] text-ink-muted">Lien personnel, valable 7 jours et une seule fois.</span>
      <input readOnly aria-label={`Lien de connexion de ${member.firstName}`} value={link} className="sr-only" data-invite-link />
    </span>
  );
}

/** Un autre gérant est invité par e-mail : il choisira son mot de passe. */
function ManagerInvite({ member }: { member: Member }) {
  const [email, setEmail] = useState(member.email ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = usePending();
  const ready = useHydrated();
  if (sent) return <span className="text-sm font-semibold text-valide">Invitation envoyée à {email.trim()}</span>;
  return (
    <form
      className="flex flex-col items-start gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void start(async () => {
          setError(null);
          const res = await inviteManager(member.id, email);
          if (res.error) setError(res.error);
          else setSent(true);
        });
      }}
    >
      <span className="flex flex-wrap gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail du gérant" aria-label={`E-mail de ${member.firstName}`} className="h-9 w-[220px] rounded-md border border-line-strong bg-surface-raised px-3 text-sm text-ink" />
        <button type="submit" disabled={pending || !ready} className="inline-flex h-9 items-center gap-2 rounded-md bg-azur px-3 text-sm font-semibold text-on-azur hover:bg-azur-strong disabled:opacity-60">
          <Mail aria-hidden size={15} /> {pending ? "Envoi…" : "Inviter par e-mail"}
        </button>
      </span>
      {error && <span className="text-sm text-critique">{error}</span>}
    </form>
  );
}

/** Déconnecte à distance le téléphone d'un agent (perdu, volé, départ). */
function DisconnectDevice({ member }: { member: Member }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = usePending();
  const ready = useHydrated();
  if (done) return <span className="text-sm font-semibold text-ink-muted">Accès coupé. Créez un nouveau lien pour le reconnecter.</span>;
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-critique">
        <Smartphone aria-hidden size={15} /> Couper son accès
      </button>
    );
  }
  return (
    <span className="flex flex-col items-start gap-2 rounded-lg bg-critique-soft p-3">
      <span className="text-sm text-ink">{member.firstName} n&apos;aura plus accès à Swipo, immédiatement, sur aucun téléphone. Il faudra un nouveau lien pour revenir.</span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-md border border-line-strong bg-surface-raised px-3 text-sm font-semibold text-ink">Annuler</button>
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await disconnectMember(member.id);
              if (res.error) setError(res.error);
              else setDone(true);
            })
          }
          className="h-9 rounded-md bg-critique px-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Couper l'accès"}
        </button>
      </span>
      {error && <span className="text-sm text-critique">{error}</span>}
    </span>
  );
}

/** Modification d'une personne de l'équipe, directement dans la liste. */
function EditMember({ member, isMe, onDone, onCancel }: { member: Member; isMe: boolean; onDone: (m: Member) => void; onCancel: () => void }) {
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [phone, setPhone] = useState(member.phone ? displayPhone(member.phone) : "");
  const [role, setRole] = useState(member.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  const id = (k: string) => `${k}-${member.id}`;
  const input = "h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink";

  return (
    <form
      aria-label={`Modifier ${member.firstName}`}
      className="flex w-full flex-col gap-4 rounded-xl bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          const res = await updateMember(member.id, { firstName, lastName, phone, role });
          if (res.error) setError(res.error);
          else if (res.member) onDone({ ...member, ...res.member });
        });
      }}
    >
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id("prenom")} className="mb-1.5 block text-sm text-ink-muted">Prénom</label>
          <input id={id("prenom")} value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={input} />
        </div>
        <div>
          <label htmlFor={id("nom")} className="mb-1.5 block text-sm text-ink-muted">Nom</label>
          <input id={id("nom")} value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor={id("portable")} className="mb-1.5 block text-sm text-ink-muted">Portable</label>
          <input id={id("portable")} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={input} />
        </div>
        <div>
          <label htmlFor={id("role")} className="mb-1.5 block text-sm text-ink-muted">Rôle</label>
          <select id={id("role")} value={role} disabled={isMe} onChange={(e) => setRole(e.target.value as Member["role"])} className={`${input} disabled:opacity-60`}>
            {(["agent", "chef", "gerant"] as const).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          {isMe && <p className="mt-1 text-[13px] text-ink-muted">Vous ne pouvez pas changer votre propre rôle.</p>}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={pending || !ready}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}

export function TeamManager({ initialTeam, origin, companyName, meId }: { initialTeam: Member[]; origin: string; companyName: string; meId: string }) {
  const [team, setTeam] = useState(initialTeam);
  const [state, action, pending] = useActionState(addMember, undefined);
  const [busy, startTransition] = usePending();
  const ready = useHydrated();
  const [rowError, setRowError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setTeam(initialTeam), [initialTeam]);
  useEffect(() => {
    if (state?.added) {
      const added = state.added;
      setTeam((t) => (t.some((m) => m.id === added.id) ? t : [...t, added]));
      formRef.current?.reset();
    }
  }, [state]);

  function toggle(m: Member) {
    setRowError(null);
    startTransition(async () => {
      const res = await setMemberActive(m.id, !m.active);
      if (res.error) setRowError(res.error);
      else setTeam((t) => t.map((x) => (x.id === m.id ? { ...x, active: !m.active } : x)));
    });
  }

  const [editing, setEditing] = useState<string | null>(null);
  const visible = [...team].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <Card className="min-w-0 flex-[999_1_520px] overflow-hidden">
        <div className="px-7 pt-[22px] pb-3.5">
          <CardTitle>Membres</CardTitle>
        </div>
        {rowError && <div className="px-7 pb-3"><FormError message={rowError} /></div>}
        <ul>
          {visible.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline px-7 py-4 ${m.active ? "" : "opacity-55"}`}>
              <Avatar id={m.id} firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} />
              <span className="min-w-0 flex-[1_1_200px]">
                <span className="block font-semibold">
                  {m.firstName} {m.lastName}
                </span>
                <span className="block text-sm text-ink-muted">
                  {ROLE_LABEL[m.role]}
                  {m.phone ? ` · ${displayPhone(m.phone)}` : ""}
                  {!m.active ? " · désactivé" : ""}
                </span>
              </span>
              {m.active && m.id !== meId && !m.hasAccount && (
                <span className="flex flex-col items-start gap-2">
                  <span className="rounded-full bg-soleil-soft px-2.5 py-0.5 text-[13px] font-semibold text-soleil-ink">Invitation à envoyer</span>
                  {m.role === "gerant" ? <ManagerInvite member={m} /> : <InviteActions member={m} origin={origin} companyName={companyName} />}
                </span>
              )}
              {m.active && m.hasAccount && m.id !== meId && (
                <span className="flex flex-col items-start gap-2">
                  <span className="rounded-full bg-valide-soft px-2.5 py-0.5 text-[13px] font-semibold text-valide">{m.role === "gerant" ? "Compte créé" : "Connecté"}</span>
                  {m.role !== "gerant" && (
                    <span className="flex flex-wrap gap-1">
                      <InviteActions member={m} origin={origin} companyName={companyName} again />
                      <DisconnectDevice member={m} />
                    </span>
                  )}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                {editing !== m.id && (
                  <button type="button" onClick={() => setEditing(m.id)} aria-label={`Modifier ${m.firstName}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-ink">
                    <Pencil aria-hidden size={14} /> Modifier
                  </button>
                )}
                {m.id !== meId && (
                  <button type="button" disabled={busy || !ready} onClick={() => toggle(m)} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-ink">
                    {m.active ? "Désactiver" : "Réactiver"}
                  </button>
                )}
              </span>
              {editing === m.id && (
                <EditMember
                  member={m}
                  isMe={m.id === meId}
                  onCancel={() => setEditing(null)}
                  onDone={(updated) => {
                    setTeam((t) => t.map((x) => (x.id === updated.id ? updated : x)));
                    setEditing(null);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 p-6">
        <CardTitle>Ajouter une personne</CardTitle>
        <form ref={formRef} action={action} className="flex flex-col gap-4">
          <FormError message={state?.error} />
          {state?.added && (
            <p role="status" className="rounded-md bg-valide-soft px-4 py-3 text-sm font-semibold text-valide">
              {state.added.firstName} est ajouté. Créez son lien de connexion dans la liste et envoyez-le-lui.
            </p>
          )}
          <Field id="first_name" name="first_name" label="Prénom" required defaultValue={state?.fields?.first_name} />
          <Field id="last_name" name="last_name" label="Nom" defaultValue={state?.fields?.last_name} />
          <Field id="phone" name="phone" type="tel" inputMode="tel" label="Portable" placeholder="06 12 34 56 78" required hint="Pour lui envoyer son lien de connexion par WhatsApp ou SMS." defaultValue={state?.fields?.phone} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-ink-muted">Rôle</legend>
            <div className="flex rounded-md bg-hairline p-1">
              {(["agent", "chef", "gerant"] as const).map((r) => (
                <label key={r} className="flex-1 cursor-pointer">
                  <input type="radio" name="role" value={r} defaultChecked={(state?.fields?.role ?? "agent") === r} className="peer sr-only" />
                  <span className="flex h-9 items-center justify-center rounded-[9px] text-sm font-semibold text-ink peer-checked:bg-surface-raised peer-checked:shadow-[0_1px_3px_#0000002e] peer-focus-visible:shadow-[0_0_0_2px_var(--azur)]">
                    {ROLE_LABEL[r]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={pending} className="mt-1">
            <UserPlus aria-hidden size={16} />
            {pending ? "Ajout…" : "Ajouter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
