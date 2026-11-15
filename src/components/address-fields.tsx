"use client";

import { useEffect, useId, useState } from "react";

export type AddressValue = { street: string; postalCode: string; city: string };

const input = "h-12 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink placeholder:text-ink-muted/70";
const label = "mb-2 block text-sm text-ink-muted";

/**
 * Adresse en trois champs : rue, code postal, ville.
 * Le code postal propose la ou les communes correspondantes (base officielle geo.api.gouv.fr).
 * Utilisable dans un formulaire classique (champs nommés `${name}street`, `${name}postal_code`, `${name}city`)
 * ou piloté par `value` / `onChange`.
 */
export function AddressFields({
  name = "",
  label: streetLabel = "Adresse",
  defaultValue,
  value,
  onChange,
  compact,
}: {
  name?: string;
  label?: string;
  defaultValue?: Partial<AddressValue>;
  value?: AddressValue;
  onChange?: (v: AddressValue) => void;
  compact?: boolean;
}) {
  const uid = useId();
  const [inner, setInner] = useState<AddressValue>({ street: defaultValue?.street ?? "", postalCode: defaultValue?.postalCode ?? "", city: defaultValue?.city ?? "" });
  const v = value ?? inner;
  const set = (patch: Partial<AddressValue>) => {
    const next = { ...v, ...patch };
    if (!value) setInner(next);
    onChange?.(next);
  };
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    if (!/^\d{5}$/.test(v.postalCode)) {
      setCities([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`https://geo.api.gouv.fr/communes?codePostal=${v.postalCode}&fields=nom&format=json`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { nom: string }[]) => {
        const names = [...new Set(list.map((c) => c.nom))].sort((a, b) => a.localeCompare(b, "fr"));
        setCities(names);
        if (names.length === 1 && !v.city.trim()) set({ city: names[0] });
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.postalCode]);

  const field = compact ? input.replace("h-12", "h-11") : input;
  return (
    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-rue`} className={label}>{streetLabel}</label>
        <input id={`${uid}-rue`} name={`${name}street`} value={v.street} onChange={(e) => set({ street: e.target.value })} required autoComplete="address-line1" placeholder="18 boulevard de Cimiez" className={field} />
      </div>
      <div>
        <label htmlFor={`${uid}-cp`} className={label}>Code postal</label>
        <input
          id={`${uid}-cp`}
          name={`${name}postal_code`}
          value={v.postalCode}
          onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
          required
          inputMode="numeric"
          pattern="\d{5}"
          title="5 chiffres"
          autoComplete="postal-code"
          placeholder="06000"
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-ville`} className={label}>Ville</label>
        <input id={`${uid}-ville`} name={`${name}city`} list={`${uid}-villes`} value={v.city} onChange={(e) => set({ city: e.target.value })} required autoComplete="address-level2" placeholder="Nice" className={field} />
        <datalist id={`${uid}-villes`}>
          {cities.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
    </div>
  );
}
