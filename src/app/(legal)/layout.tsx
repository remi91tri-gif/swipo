import Link from "next/link";
import { Logo } from "@/components/ui";
import { LEGAL_UPDATED } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface-raised">
        <div className="mx-auto flex h-16 max-w-[820px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Swipo, accueil"><Logo height={26} /></Link>
          <nav className="flex gap-4 text-sm font-semibold text-ink-muted">
            <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
            <Link href="/conditions" className="hover:text-ink">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[820px] px-4 py-12 sm:px-6">
        <article className="legal flex flex-col gap-4 text-[16px] leading-7">{children}</article>
        <p className="mt-12 text-sm text-ink-muted">Dernière mise à jour : {LEGAL_UPDATED}.</p>
      </main>
    </div>
  );
}
