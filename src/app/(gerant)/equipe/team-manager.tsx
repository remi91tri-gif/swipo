"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, MessageCircle, Send, UserPlus } from "lucide-react";
import { Avatar, Button, Card, CardTitle, Field, FormError } from "@/components/ui";
import { ROLE_LABEL, displayPhone } from "@/lib/format";
import type { Member } from "@/lib/types";
import { addMember, setMemberActive } from "./actions";

function inviteText(m: Member, companyName: string, link: string) {
  return `Bonjour ${m.firstName}, ${companyName} vous invite sur Swipo pour voir vos chantiers. Connectez-vous avec votre numéro de portable : ${link}`;
}

function InviteActions({ member, origin, companyName }: { member: Member; origin: string; companyName: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${origin}/agent/connexion?tel=${encodeURIComponent(member.phone ?? "")}`;
  const message = inviteText(member, companyName, link);
  const digits = (member.phone ?? "").replace(/\D/g, "");

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
    <div className="flex flex-wrap gap-2">
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
    </div>
  );
}

export function TeamManager({ initialTeam, origin, companyName, meId }: { initialTeam: Member[]; origin: string; companyName: string; meId: string }) {
  const [team, setTeam] = useState(initialTeam);
  const [state, action, pending] = useActionState(addMember, undefined);
  const [busy, startTransition] = useTransition();
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
              <Avatar id={m.id} firstName={m.firstName} lastName={m.lastName} />
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
              {m.active && m.role !== "gerant" && !m.hasAccount && (
                <span className="flex flex-col items-start gap-2">
                  <span className="rounded-full bg-soleil-soft px-2.5 py-0.5 text-[13px] font-semibold text-soleil-ink">Invitation à envoyer</span>
                  <InviteActions member={m} origin={origin} companyName={companyName} />
                </span>
              )}
              {m.active && m.hasAccount && m.role !== "gerant" && (
                <span className="rounded-full bg-valide-soft px-2.5 py-0.5 text-[13px] font-semibold text-valide">Connecté</span>
              )}
              {m.id !== meId && m.role !== "gerant" && (
                <button type="button" disabled={busy} onClick={() => toggle(m)} className="ml-auto h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-hairline hover:text-ink">
                  {m.active ? "Désactiver" : "Réactiver"}
                </button>
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
              {state.added.firstName} est ajouté. Envoyez-lui l&apos;invitation depuis la liste.
            </p>
          )}
          <Field id="first_name" name="first_name" label="Prénom" required defaultValue={state?.fields?.first_name} />
          <Field id="last_name" name="last_name" label="Nom" defaultValue={state?.fields?.last_name} />
          <Field id="phone" name="phone" type="tel" inputMode="tel" label="Portable" placeholder="06 12 34 56 78" required hint="Il sert à se connecter par code SMS." defaultValue={state?.fields?.phone} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-ink-muted">Rôle</legend>
            <div className="flex rounded-md bg-hairline p-1">
              {(["agent", "chef"] as const).map((r) => (
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
