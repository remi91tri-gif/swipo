"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, LayoutGrid, LogOut, Users } from "lucide-react";
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

export function Sidebar({
  person,
  role,
  companyName,
  signOut,
}: {
  person: { id: string; firstName: string; lastName: string };
  role: "gerant" | "chef" | "agent";
  companyName: string;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  return (
    <aside className="flex flex-[1_1_232px] flex-col gap-8 border-line bg-surface-raised px-4 py-7 max-[871px]:border-b min-[872px]:sticky min-[872px]:top-0 min-[872px]:h-dvh min-[872px]:max-w-[232px] min-[872px]:self-start min-[872px]:overflow-y-auto min-[872px]:border-r">
      <div className="flex items-center justify-between gap-3 pl-2">
        <Link href="/aujourdhui" aria-label="Swipo, retour à Aujourd'hui">
          <Logo />
        </Link>
        <NotificationBell role={role} placement="sidebar" />
      </div>
      <nav aria-label="Menu principal" className="flex flex-col gap-0.5 max-[871px]:flex-row max-[871px]:flex-wrap">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-ink-muted hover:bg-hairline hover:text-ink aria-[current=page]:bg-azur-subtle aria-[current=page]:font-semibold aria-[current=page]:text-azur"
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
          <Avatar {...person} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {person.firstName} {person.lastName}
            </span>
            <span className="block truncate text-[13px] text-ink-muted">{companyName}</span>
          </span>
          <form action={signOut}>
            <button type="submit" aria-label="Se déconnecter" className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-hairline hover:text-ink">
              <LogOut aria-hidden size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
