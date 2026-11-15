"use client";

import { usePending } from "@/lib/use-pending";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { VAT_NOTE, HT, PLANS, euros, price, type Interval, type PlanId } from "@/lib/billing/plans";
import { useHydrated } from "@/lib/use-hydrated";
import { openPortal, redeemPilotCode, startCheckout } from "./actions";

export function PlanPicker({ current, active, pilotDiscount }: { current: PlanId; active: boolean; pilotDiscount: boolean }) {
  const [interval, setInterval] = useState<Interval>("month");
  const [pending, start] = usePending();
  const [chosen, setChosen] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = useHydrated();

  const go = (plan: PlanId) =>
    start(async () => {
      setError(null);
      setChosen(plan);
      const res = active ? await openPortal() : await startCheckout(plan, interval);
      if (res.url) window.location.href = res.url;
      else setError(res.error ?? "Réessayez dans un instant.");
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Paiement" className="flex rounded-[12px] bg-hairline p-1">
          {(
            [
              ["month", "Mensuel"],
              ["year", "Annuel · 1 mois offert"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={interval === v}
              onClick={() => setInterval(v)}
              className="h-10 rounded-[9px] px-4 text-sm font-semibold text-ink-muted transition-colors aria-checked:bg-surface-raised aria-checked:text-ink aria-checked:shadow-[0_1px_3px_#0000002e]"
            >
              {label}
            </button>
          ))}
        </div>
        {pilotDiscount && <p className="rounded-full bg-valide-soft px-3 py-1 text-sm font-semibold text-valide">Entreprise pilote : -50 % à vie</p>}
      </div>
      <FormError message={error} />
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const base = price(p.id, interval);
          const due = pilotDiscount ? Math.round(base / 2) : base;
          const isCurrent = active && p.id === current;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col gap-4 rounded-2xl border bg-surface-raised p-6 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-hero ${p.highlight ? "border-azur" : "border-line"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-azur px-2.5 py-0.5 text-[12px] font-semibold text-on-azur">
                  <Sparkles aria-hidden size={12} /> Le plus choisi
                </span>
              )}
              <div>
                <p className="font-display text-xl font-semibold">{p.name}</p>
                <p className="text-sm text-ink-muted">{p.tagline}</p>
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-[34px] leading-none font-semibold tracking-[-0.02em]">{euros(due)}</span>
                <span className="text-sm text-ink-muted">{HT.trim() ? "HT " : ""}/ {interval === "year" ? "an" : "mois"}</span>
              </p>
              {(pilotDiscount || interval === "year") && (
                <p className="-mt-2 text-sm text-ink-muted">
                  {pilotDiscount && <span className="line-through">{euros(base)}</span>}
                  {interval === "year" && ` soit ${euros(Math.round(due / 12))}${HT} / mois`}
                </p>
              )}
              <ul className="flex flex-1 flex-col gap-2 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check aria-hidden size={17} className="mt-0.5 flex-none text-valide" />{f}</li>
                ))}
              </ul>
              <Button type="button" variant={p.highlight ? "primary" : "secondary"} disabled={pending || !ready || isCurrent} onClick={() => go(p.id)}>
                {isCurrent ? "Votre offre" : pending && chosen === p.id ? "Ouverture…" : active ? "Changer d'offre" : `Choisir ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-ink-muted">{VAT_NOTE} Paiement sécurisé par Stripe. Sans engagement : résiliable à tout moment, jusqu&apos;à la fin de la période payée.</p>
    </div>
  );
}

export function PortalButton({ label = "Gérer mon abonnement" }: { label?: string }) {
  const [pending, start] = usePending();
  const [error, setError] = useState<string | null>(null);
  const ready = useHydrated();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending || !ready}
        onClick={() =>
          start(async () => {
            const res = await openPortal();
            if (res.url) window.location.href = res.url;
            else setError(res.error ?? null);
          })
        }
      >
        {pending ? "Ouverture…" : label}
      </Button>
      <FormError message={error} />
    </div>
  );
}

export function PilotCode() {
  const [code, setCode] = useState("");
  const [pending, start] = usePending();
  const [error, setError] = useState<string | null>(null);
  const ready = useHydrated();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await redeemPilotCode(code);
          if (res.error) setError(res.error);
        });
      }}
    >
      <div className="min-w-[220px] flex-1">
        <label htmlFor="pilot" className="mb-2 block text-sm text-ink-muted">Code entreprise pilote</label>
        <input id="pilot" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className="h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink uppercase" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending || !ready}>{pending ? "Vérification…" : "Valider le code"}</Button>
      <div className="w-full"><FormError message={error} /></div>
    </form>
  );
}
