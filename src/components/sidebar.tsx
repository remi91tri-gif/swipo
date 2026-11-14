"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  { href: "/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/parametres", label: "Paramètres", icon: Settings },
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
  const current = NAV.find(({ href }) => path === href || path.startsWith(href + "/"));
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
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-ink-muted hover:bg-hairline max-[871px]:py-3 max-[871px]:text-[16px] hover:text-ink aria-[current=page]:bg-azur-subtle aria-[current=page]:font-semibold aria-[current=page]:text-azur"
            >
              <Icon aria-hidden size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
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
          <form action={signOut}>
            <button type="submit" aria-label="Se déconnecter" className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-hairline hover:text-ink">
              <LogOut aria-hidden size={16} />
            </button>
          </form>
        </div>
      </div>
      </div>
    </aside>
  );
}
