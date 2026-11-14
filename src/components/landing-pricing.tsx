"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { PLANS, euros, price, type Interval } from "@/lib/billing/plans";

/** Tarifs de la page d'accueil, avec le choix mensuel / annuel. */
export function LandingPricing() {
  const [interval, setInterval] = useState<Interval>("month");
  return (
    <div className="flex flex-col items-center gap-10">
      <div role="radiogroup" aria-label="Paiement" className="flex rounded-[14px] border border-line bg-surface-raised p-1 shadow-card">
        {(
          [
            ["month", "Mensuel"],
            ["year", "Annuel"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={interval === v}
            onClick={() => setInterval(v)}
            className="flex h-11 items-center gap-2 rounded-[10px] px-5 text-[15px] font-semibold text-ink-muted transition-colors aria-checked:bg-ink aria-checked:text-on-ink"
          >
            {label}
            {v === "year" && <span className="rounded-full bg-soleil px-2 py-0.5 text-[11px] font-bold text-[#12202b]">1 mois offert</span>}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-4 pb-2 md:mx-0 md:grid md:w-full md:snap-none md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
        {PLANS.map((p, k) => {
          const amount = price(p.id, interval);
          return (
            <div
              key={p.id}
              data-reveal
              style={{ "--d": `${k * 110}ms` } as React.CSSProperties}
              className={`spot group relative flex min-w-[84%] snap-center flex-col gap-5 rounded-2xl border bg-surface-raised p-6 sm:min-w-[60%] sm:p-8 md:min-w-0 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-hero ${p.highlight ? "border-azur shadow-hero" : "border-line shadow-card"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3.5 left-8 inline-flex items-center gap-1 rounded-full bg-azur px-3 py-1 text-[12px] font-semibold text-on-azur">
                  <Sparkles aria-hidden size={12} /> Le plus choisi
                </span>
              )}
              <div>
                <p className="font-display text-[22px] font-semibold">{p.name}</p>
                <p className="text-ink-muted">{p.tagline}</p>
              </div>
              <div>
                <p className="flex items-baseline gap-1.5">
                  <span key={amount} className="count-in font-display text-[44px] leading-none font-semibold tracking-[-0.03em]">{euros(amount)}</span>
                  <span className="text-ink-muted">HT / {interval === "year" ? "an" : "mois"}</span>
                </p>
                <p className="mt-1.5 h-5 text-sm text-ink-muted">{interval === "year" ? `soit ${euros(Math.round(amount / 12))} HT par mois` : ""}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check aria-hidden size={18} className="mt-0.5 flex-none text-valide" />{f}</li>
                ))}
              </ul>
              <Link
                href="/inscription"
                className={`shine inline-flex h-12 items-center justify-center rounded-md font-semibold transition-transform hover:-translate-y-0.5 ${p.highlight ? "bg-azur text-on-azur" : "border border-line-strong bg-surface text-ink hover:bg-hairline"}`}
              >
                Essayer 14 jours gratuitement
              </Link>
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-ink-muted md:hidden">Faites glisser pour voir les 3 offres.</p>
      <p className="text-center text-sm text-ink-muted">Prix par entreprise, hors taxes. Sans carte bancaire pendant l&apos;essai, sans engagement ensuite.</p>
    </div>
  );
}
