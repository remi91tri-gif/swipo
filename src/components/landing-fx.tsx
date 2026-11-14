"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Camera, Check, CheckCircle2, MapPin } from "lucide-react";

/**
 * Effets de la page d'accueil, sans rien changer au contenu :
 * - apparition douce des blocs au défilement ([data-reveal]) ;
 * - halo lumineux qui suit la souris sur les cartes (.spot) ;
 * - léger relief 3D qui suit la souris ([data-tilt]).
 * Tout est coupé si l'appareil demande moins d'animations.
 */
export function LandingFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => (el.dataset.shown = ""));
      return;
    }
    root.classList.add("fx");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>(".spot");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--x", `${ev.clientX - r.left}px`);
        card.style.setProperty("--y", `${ev.clientY - r.top}px`);
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    const tilts = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"));
    const cleanups = tilts.map((el) => {
      const move = (ev: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - 0.5;
        const py = (ev.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", `${(-py * 6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
      };
      const leave = () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    });

    return () => {
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
      cleanups.forEach((c) => c());
    };
  }, []);
  return null;
}

// --- Démonstration animée du produit (accroche) ----------------------------------------------

type Pill = { label: string; tone: string };
const P = {
  valide: { label: "Validé", tone: "bg-valide-soft text-valide" },
  enCours: { label: "En cours", tone: "bg-azur-soft text-azur" },
  termine: { label: "Terminé", tone: "bg-neutral-soft text-ink" },
  aTraiter: { label: "À traiter", tone: "bg-critique-soft text-critique" },
  planifie: { label: "Planifié", tone: "bg-neutral-soft text-ink-muted" },
} satisfies Record<string, Pill>;

/** Scénario en boucle : l'agent coche, termine ; le gérant reçoit la bulle ; le chantier suivant démarre. */
const SCENES = [
  { checks: 1, photos: [3, 0], rows: [P.valide, P.enCours, P.aTraiter, P.planifie], toast: false, pressed: false },
  { checks: 2, photos: [3, 1], rows: [P.valide, P.enCours, P.aTraiter, P.planifie], toast: false, pressed: false },
  { checks: 3, photos: [3, 2], rows: [P.valide, P.enCours, P.aTraiter, P.planifie], toast: false, pressed: true },
  { checks: 3, photos: [3, 2], rows: [P.valide, P.termine, P.aTraiter, P.planifie], toast: true, pressed: false },
  { checks: 3, photos: [3, 2], rows: [P.valide, P.termine, P.aTraiter, P.enCours], toast: true, pressed: false },
];

const JOBS = [
  { time: "08:00", title: "Vitrerie · Boulangerie du Port", who: "Karim" },
  { time: "10:30", title: "Remise en état · Rue Barla", who: "Inès, Yanis" },
  { time: "14:00", title: "Fin de chantier · Villa Arson", who: "Karim" },
  { time: "16:30", title: "Vitrerie · Cabinet Masséna", who: "Yanis" },
];

export function HeroDemo() {
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (box.current) io.observe(box.current);
    const t = setInterval(() => visible && document.visibilityState === "visible" && setI((x) => (x + 1) % SCENES.length), 1900);
    return () => {
      clearInterval(t);
      io.disconnect();
    };
  }, []);

  const s = SCENES[i];
  const counts = {
    prevus: 4,
    enCours: s.rows.filter((r) => r === P.enCours).length,
    termines: s.rows.filter((r) => r === P.termine || r === P.valide).length,
  };

  return (
    <div ref={box} aria-hidden data-tilt className="tilt relative mx-auto w-full max-w-[640px] select-none">
      {/* Écran du gérant */}
      <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-hero sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted">AUJOURD&apos;HUI</p>
            <p className="font-display text-lg font-semibold tracking-[-0.01em]">Bonjour Marc</p>
          </div>
          <span className={`relative flex size-9 items-center justify-center rounded-full bg-hairline text-ink-muted ${s.toast ? "text-azur" : ""}`}>
            <Bell size={16} className={s.toast ? "bell-ring" : ""} />
            {s.toast && <span className="pop-in absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-critique ring-2 ring-surface-raised" />}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            [counts.prevus, "prévus"],
            [counts.enCours, "en cours"],
            [counts.termines, "terminés"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-lg bg-surface px-3 py-2.5">
              <p key={`${l}-${n}`} className="count-in font-display text-xl font-semibold tabular-nums">{n}</p>
              <p className="text-[12px] text-ink-muted">{l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 flex flex-col lg:pr-32">
          {JOBS.map((j, k) => (
            <li key={j.time} className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
              <span className="w-11 text-[13px] font-semibold text-ink-muted tabular-nums">{j.time}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{j.title}</span>
                <span className="block text-[12px] text-ink-muted">{j.who}</span>
              </span>
              <span key={s.rows[k].label} className={`pill-in whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.rows[k].tone}`}>{s.rows[k].label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bulle reçue par le gérant */}
      {s.toast && (
        <div className="toast-in absolute -top-5 left-6 flex items-center gap-2.5 rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 shadow-hero sm:left-auto sm:right-24">
          <span className="flex size-7 items-center justify-center rounded-full bg-valide-soft text-valide"><CheckCircle2 size={15} /></span>
          <span className="text-[13px]">
            <span className="block font-semibold">Chantier terminé</span>
            <span className="block text-ink-muted">Rue Barla · 5 photos</span>
          </span>
        </div>
      )}

      {/* Téléphone de l'agent */}
      <div className="float absolute -right-16 -bottom-28 hidden w-[210px] rounded-[30px] border border-line-strong bg-surface p-2.5 shadow-hero lg:block">
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-surface-raised p-3.5">
          <p className="text-center text-[11px] font-semibold text-ink-muted">10:30 · {i >= 3 ? "Terminé" : "En cours"}</p>
          <p className="font-display text-[15px] leading-5 font-semibold">Remise en état après locataire</p>
          <p className="flex gap-1.5 text-[12px] text-ink-muted"><MapPin size={13} className="mt-0.5 flex-none" /> 27 rue Barla, Nice</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(["Avant", "Après"] as const).map((l, k) => (
              <span key={l} className="flex flex-col items-center gap-1 rounded-lg bg-azur-subtle py-2 text-[11px] font-semibold text-azur">
                <Camera size={14} />
                <span>
                  {l} · <span key={s.photos[k]} className="count-in inline-block tabular-nums">{s.photos[k]}</span>
                </span>
              </span>
            ))}
          </div>
          {["Cuisine", "Salle de bain", "Sols"].map((t, k) => {
            const on = k < s.checks;
            return (
              <span key={t} className="flex items-center gap-2 text-[12px]">
                <span className={`flex size-4 items-center justify-center rounded-full transition-colors duration-300 ${on ? "bg-valide text-on-ink" : "border-2 border-line-strong"}`}>
                  {on && <Check size={9} strokeWidth={3.5} className="pop-in" />}
                </span>
                <span className={on ? "text-ink-muted" : ""}>{t}</span>
              </span>
            );
          })}
          <span className={`mt-1 flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold transition-all duration-200 ${s.pressed ? "scale-95 bg-azur-strong text-on-azur" : "bg-azur text-on-azur"}`}>
            {i >= 3 ? "C'est net." : "Terminer"}
          </span>
        </div>
      </div>
    </div>
  );
}
