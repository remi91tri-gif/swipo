"use client";

import { useEffect, useMemo, useState } from "react";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";
import { AlertCircle } from "lucide-react";
import { Avatar, Button, Card, FormError } from "@/components/ui";
import { CLIENT_TYPE_LABEL, ROLE_LABEL } from "@/lib/format";
import { TRADE_PRESETS, tradePreset } from "@/lib/trades";
import type { Client, MemberRole } from "@/lib/types";
import { checkConflicts, createJobAction, updateJobAction } from "../actions";

/** Valeurs d'un chantier existant, pour le modifier avec le même formulaire. */
export type JobInitial = {
  jobId: string;
  clientId: string;
  siteId: string | null;
  trade: string;
  title: string;
  date: string | null;
  time: string | null;
  duration: number | null;
  instructions: string | null;
  photos: boolean;
  checklist: string[];
  members: string[];
};

type Person = { id: string; firstName: string; lastName: string; role: MemberRole; avatarUrl?: string | null };

const input = "h-12 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink";
const label = "mb-2 block text-sm text-ink-muted";
const section = "flex flex-col gap-[18px] border-t border-hairline px-7 py-[26px] first:border-t-0";
const eyebrow = "text-[13px] font-semibold tracking-[0.06em] text-ink-muted";

function Switch({ name, checked, onChange, title, sub }: { name: string; checked: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-muted">{sub}</span>
      </span>
      <input type="checkbox" role="switch" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="flex h-[26px] w-11 flex-none items-center rounded-full bg-line-strong p-[3px] transition-colors peer-checked:justify-end peer-checked:bg-azur peer-focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--azur)]">
        <span className="size-5 rounded-full bg-surface-raised shadow-[0_1px_2px_#12202b33]" />
      </span>
    </label>
  );
}

export function NewJobForm({
  clients,
  people,
  defaultClient,
  defaultDate,
  initial,
}: {
  clients: Client[];
  people: Person[];
  defaultClient: string;
  defaultDate: string;
  initial?: JobInitial;
}) {
  const [state, setState] = useState<{ error?: string }>();
  const [pending, run] = usePending();
  const ready = useHydrated();

  const [clientId, setClientId] = useState(initial?.clientId ?? (defaultClient || (clients.length ? clients[0].id : "new")));
  const client = clients.find((c) => c.id === clientId);
  const [siteId, setSiteId] = useState(initial?.siteId ?? client?.sites[0]?.id ?? "new");
  // Changement de client : on garde l'adresse si elle est à lui, sinon on prend sa première.
  useEffect(() => setSiteId((cur) => (client?.sites.some((x) => x.id === cur) ? cur : (client?.sites[0]?.id ?? "new"))), [client]);

  const initialPreset = initial ? TRADE_PRESETS.find((t) => t.label === initial.trade)?.id ?? "" : TRADE_PRESETS[0].id;
  const [trade, setTrade] = useState<string>(initialPreset);
  const preset = tradePreset(trade || TRADE_PRESETS[0].id);
  const [title, setTitle] = useState<string>(initial?.title ?? preset.title);
  const [duration, setDuration] = useState<number>(initial?.duration ?? preset.duration);
  const [checklist, setChecklist] = useState<string>(initial ? initial.checklist.join("\n") : preset.checklist.join("\n"));
  function pickTrade(id: string) {
    const p = tradePreset(id);
    setTrade(id);
    setTitle(p.title);
    setDuration(p.duration);
    setChecklist(p.checklist.join("\n"));
  }

  const [date, setDate] = useState(initial ? (initial.date ?? "") : defaultDate);
  const [time, setTime] = useState(initial ? (initial.time?.slice(0, 5) ?? "") : "08:00");
  const [members, setMembers] = useState<string[]>(initial?.members ?? []);
  const [photos, setPhotos] = useState(initial?.photos ?? true);
  const [checklistOn, setChecklistOn] = useState(initial ? initial.checklist.length > 0 : true);

  const [conflicts, setConflicts] = useState<{ member: string; job: string; slot: string }[]>([]);
  const memberKey = members.join(",");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const res = members.length && date && time ? await checkConflicts(date, time, duration, members) : [];
      if (alive) setConflicts(res);
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, duration, memberKey]);

  const sortedPeople = useMemo(() => [...people].sort((a, b) => Number(a.role === "gerant") - Number(b.role === "gerant")), [people]);

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void run(async () => {
            setState(undefined);
            const res = await (initial ? updateJobAction : createJobAction)(undefined, fd);
            if (res?.url) window.location.assign(res.url);
            else setState({ error: res?.error ?? "Réessayez dans un instant." });
          });
        }}
      >
        {initial && <input type="hidden" name="job_id" value={initial.jobId} />}
        {state?.error && (
          <div className="px-7 pt-6">
            <FormError message={state.error} />
          </div>
        )}

        <div className={section}>
          <p className={eyebrow}>CLIENT ET LIEU</p>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="client_id" className={label}>Client</label>
              <select id="client_id" name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} className={input}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ Nouveau client</option>
              </select>
            </div>
            {clientId !== "new" && (
              <div className="min-w-[220px] flex-1">
                <label htmlFor="site_id" className={label}>Adresse</label>
                <select id="site_id" name="site_id" value={siteId} onChange={(e) => setSiteId(e.target.value)} className={input}>
                  {client?.sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.label ? `${s.label} · ` : ""}{s.address}</option>
                  ))}
                  <option value="new">+ Nouvelle adresse</option>
                </select>
              </div>
            )}
          </div>

          {clientId === "new" && (
            <div className="flex flex-wrap gap-4 rounded-lg bg-surface p-4">
              <div className="min-w-[200px] flex-[2]">
                <label htmlFor="new_client_name" className={label}>Nom du client</label>
                <input id="new_client_name" name="new_client_name" className={input} placeholder="Mme Rossi, SCI Les Arcades…" />
              </div>
              <div className="min-w-[150px] flex-1">
                <label htmlFor="new_client_type" className={label}>Type</label>
                <select id="new_client_type" name="new_client_type" className={input}>
                  {Object.entries(CLIENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="min-w-[180px] flex-1">
                <label htmlFor="new_client_phone" className={label}>Téléphone (facultatif)</label>
                <input id="new_client_phone" name="new_client_phone" type="tel" inputMode="tel" className={input} />
              </div>
            </div>
          )}

          {(clientId === "new" || siteId === "new") && (
            <div className="flex flex-wrap gap-4 rounded-lg bg-surface p-4">
              <div className="min-w-[240px] flex-[2]">
                <label htmlFor="new_address" className={label}>Adresse du chantier</label>
                <input id="new_address" name="new_address" className={input} placeholder="18 bd de Cimiez, 06000 Nice" autoComplete="street-address" />
              </div>
              <div className="min-w-[200px] flex-1">
                <label htmlFor="new_access" className={label}>Accès (facultatif)</label>
                <input id="new_access" name="new_access" className={input} placeholder="Code, clés, étage…" />
              </div>
            </div>
          )}

          <fieldset>
            <legend className={label}>Prestation</legend>
            <div className="flex flex-wrap gap-2">
              {TRADE_PRESETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={trade === t.id}
                  onClick={() => pickTrade(t.id)}
                  className="h-10 rounded-full border border-line-strong bg-surface-raised px-4 text-sm font-semibold text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="trade_label" value={trade ? preset.label : (initial?.trade ?? preset.label)} />
          </fieldset>
          <div>
            <label htmlFor="title" className={label}>Intitulé</label>
            <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={input} />
          </div>
        </div>

        <div className={section}>
          <p className={eyebrow}>QUAND ET QUI</p>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-[2]">
              <label htmlFor="date" className={label}>Date</label>
              <input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </div>
            <div className="min-w-[120px] flex-1">
              <label htmlFor="time" className={label}>Début</label>
              <input id="time" name="time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className={`${input} tabular-nums`} />
            </div>
            <div className="min-w-[120px] flex-1">
              <label htmlFor="duration" className={label}>Durée</label>
              <select id="duration" name="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={input}>
                {[30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480].map((m) => (
                  <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? " 30" : ""}`}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className={label}>Agents</legend>
            {people.length <= 1 && <p className="mb-2 text-sm text-ink-muted">Ajoutez votre équipe depuis la page Équipe pour l&apos;affecter aux chantiers.</p>}
            <div className="flex flex-wrap gap-2">
              {sortedPeople.map((m) => {
                const on = members.includes(m.id);
                return (
                  <label key={m.id} className="cursor-pointer">
                    <input type="checkbox" name="members" value={m.id} checked={on} onChange={() => setMembers((cur) => (on ? cur.filter((x) => x !== m.id) : [...cur, m.id]))} className="peer sr-only" />
                    <span className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-surface-raised pr-4 pl-1.5 text-sm font-semibold text-ink peer-checked:border-azur peer-checked:bg-azur-subtle peer-focus-visible:shadow-[0_0_0_2px_var(--azur)]">
                      <Avatar id={m.id} firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} size={32} />
                      {m.firstName} {m.lastName}
                      {m.role !== "agent" && <span className="font-normal text-ink-muted">· {ROLE_LABEL[m.role]}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {members.length > 1 && <input type="hidden" name="lead" value={members[0]} />}
            {conflicts.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {conflicts.map((c) => (
                  <li key={c.member + c.job} className="flex items-start gap-2.5 text-sm text-reprise">
                    <AlertCircle aria-hidden size={18} className="mt-0.5 flex-none" />
                    {c.member} est déjà sur {c.job} de {c.slot}. Vous pouvez quand même l&apos;affecter.
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>

        <div className={section}>
          <p className={eyebrow}>POUR L&apos;ÉQUIPE</p>
          <div>
            <label htmlFor="instructions" className={label}>Consignes</label>
            <textarea id="instructions" name="instructions" rows={3} defaultValue={initial?.instructions ?? ""} className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] text-ink" placeholder="Accès, clés, points d'attention, produits à éviter…" />
          </div>
          <Switch name="photos_on" checked={photos} onChange={setPhotos} title="Photos avant et après" sub="Demandées au démarrage et à la fin" />
          <Switch name="checklist_on" checked={checklistOn} onChange={setChecklistOn} title="Checklist" sub={checklistOn ? "Une tâche par ligne, modifiable" : "Désactivée pour ce chantier"} />
          {checklistOn && (
            <textarea name="checklist" aria-label="Points de la checklist, un par ligne" rows={Math.max(4, checklist.split("\n").length)} value={checklist} onChange={(e) => setChecklist(e.target.value)} className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] leading-7 text-ink" />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-hairline px-7 py-5">
          <Button type="submit" disabled={pending || !ready} className="h-12 px-6 text-base">
            {initial ? (pending ? "Enregistrement…" : "Enregistrer les modifications") : pending ? "Création…" : "Créer le chantier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
