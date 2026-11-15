"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const LINKS = [
  ["#fonctionnalites", "Produit"],
  ["#tarifs", "Tarifs"],
  ["#questions", "Questions"],
] as const;

/** Menu « trois barres » de la page d'accueil, sur téléphone et tablette. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink"
      >
        {open ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <nav
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
            className="panel-in mx-3 mt-2 flex flex-col gap-1 rounded-2xl border border-line bg-surface-raised p-3 shadow-hero"
          >
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3.5 text-[17px] font-semibold text-ink active:bg-hairline">
                {label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
              <Link href="/connexion" className="flex h-12 items-center justify-center rounded-md border border-line-strong font-semibold text-ink">Se connecter</Link>
              <Link href="/inscription" className="flex h-12 items-center justify-center rounded-md bg-azur font-semibold text-on-azur">Essai gratuit</Link>
            </div>
            <Link href="/agent/connexion" className="px-4 pt-3 pb-1 text-center text-sm font-semibold text-ink-muted">Vous êtes agent ? Connexion agent</Link>
          </nav>
        </div>
      )}
    </div>
  );
}

/** Bouton d'essai qui reste en bas de l'écran sur téléphone, une fois l'accroche passée. */
export function MobileCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 700;
      setShow(window.scrollY > 520 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <Link href="/inscription" tabIndex={show ? 0 : -1} className="flex h-[52px] items-center justify-center gap-2 rounded-md bg-azur text-base font-semibold text-on-azur shadow-card">
        Essayer gratuitement 14 jours <ArrowRight aria-hidden size={18} />
      </Link>
    </div>
  );
}
