"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ClipboardList, CreditCard, Home, LayoutGrid, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { Avatar, Logo } from "./ui";
import { ThemeSwitch } from "./theme-toggle";
import { NotificationBell } from "./notifications";

const NAV = [
  { href: "/aujourdhui", label: "Aujourd'hui", icon: LayoutGrid },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/chantiers", label: "Chantiers", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Home },
  { href: "/equipe", label: "Équipe", icon: Users },
];

/** Le compte : en bas du menu, plus discret que les écrans de gestion. */
const ACCOUNT = [
  { href: "/parametres", label: "Paramètres", icon: Settings },
  { href: "/abonnement", label: "Abonnement", icon: CreditCard },
];

export function Sidebar({
  person,
  role,
  companyName,
  signOut,
}: {
  person: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
  role: "gerant" | "chef" | "agent";
  companyName: string;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  // Sur téléphone et petite tablette : barre en haut et menu « trois barres » qui se déplie.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const current = [...NAV, ...ACCOUNT].find(({ href }) => path === href || path.startsWith(href + "/"));
  return (
    <aside className="flex flex-[1_1_232px] flex-col gap-8 border-line bg-surface-raised px-4 py-7 max-[871px]:sticky max-[871px]:top-0 max-[871px]:z-30 max-[871px]:gap-0 max-[871px]:border-b max-[871px]:py-2.5 min-[872px]:sticky min-[872px]:top-0 min-[872px]:h-dvh min-[872px]:max-w-[232px] min-[872px]:self-start min-[872px]:overflow-y-auto min-[872px]:border-r">
      <div className="flex items-center justify-between gap-3 pl-2 max-[871px]:pl-0">
        <Link href="/aujourdhui" aria-label="Swipo, retour à Aujourd'hui">
          <Logo />
        </Link>
        <span className="flex-1 truncate text-center text-sm font-semibold text-ink-muted min-[872px]:hidden">{current?.label}</span>
        <div className="flex items-center gap-2">
          <NotificationBell role={role} placement="sidebar" />
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink min-[872px]:hidden"
          >
            {open ? <X aria-hidden size={18} /> : <Menu aria-hidden size={18} />}
          </button>
        </div>
      </div>
      <div className={`${open ? "flex" : "hidden"} panel-in flex-1 flex-col gap-8 max-[871px]:max-h-[calc(100dvh-64px)] max-[871px]:overflow-y-auto max-[871px]:pt-4 max-[871px]:pb-3 min-[872px]:flex min-[872px]:animate-none`}>
      <nav aria-label="Menu principal" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-ink-muted transition-colors hover:text-ink max-[871px]:py-3 max-[871px]:text-[16px] aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:before:absolute aria-[current=page]:before:top-1/2 aria-[current=page]:before:-left-1 aria-[current=page]:before:h-px aria-[current=page]:before:w-3 aria-[current=page]:before:bg-soleil"
            >
              <Icon aria-hidden size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <nav aria-label="Mon compte" className="flex flex-col gap-0.5 border-t border-hairline pt-3">
          {ACCOUNT.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-ink-muted hover:text-ink max-[871px]:py-2.5 aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                <Icon aria-hidden size={16} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <ThemeSwitch />
        <div className="flex items-center gap-3 rounded-[14px] bg-surface p-3">
          <Link href="/parametres" aria-label="Mon profil et mes paramètres" className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] hover:opacity-80">
          <Avatar {...person} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {person.firstName} {person.lastName}
            </span>
            <span className="block truncate text-[13px] text-ink-muted">{companyName}</span>
          </span>
          </Link>
          <SignOutButton signOut={signOut} />
        </div>
      </div>
      </div>
    </aside>
  );
}

/** Déconnexion avec confirmation (Annuler / Se déconnecter). */
function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirming(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  return (
    <>
      <button
        type="button"
        aria-label="Se déconnecter"
        onClick={() => setConfirming(true)}
        className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-hairline hover:text-ink"
      >
        <LogOut aria-hidden size={16} />
      </button>
      {confirming &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 px-4" onClick={() => setConfirming(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deconnexion-titre"
              onClick={(e) => e.stopPropagation()}
              className="panel-in flex w-full max-w-[400px] flex-col gap-3 rounded-2xl bg-surface-raised p-6 text-left shadow-hero"
            >
              <p id="deconnexion-titre" className="font-display text-xl font-semibold">Se déconnecter ?</p>
              <p className="text-ink-muted">Vous devrez saisir à nouveau votre e-mail et votre mot de passe pour revenir.</p>
              <form action={signOut} onSubmit={() => setPending(true)} className="mt-2 flex flex-wrap justify-end gap-2">
                <button type="button" autoFocus onClick={() => setConfirming(false)} className="h-11 rounded-md border border-line-strong bg-surface-raised px-[18px] font-semibold text-ink hover:bg-hairline">
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="h-11 rounded-md bg-azur px-[18px] font-semibold text-on-azur hover:bg-azur-strong disabled:opacity-60">
                  {pending ? "Déconnexion…" : "Se déconnecter"}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
