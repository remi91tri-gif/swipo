import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { DeleteMyAccount } from "@/components/delete-account";
import { AgentSignOut } from "@/components/offline-agent";
import { ThemeButton } from "@/components/theme-toggle";
import { getAgentSession } from "@/lib/data";
import { ROLE_LABEL, displayPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Mon profil" };

export default async function AgentProfilePage() {
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  const { member, company } = session;
  return (
    <>
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Link href="/agent" aria-label="Retour à mes chantiers" className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-surface-raised text-ink">
          <ChevronLeft aria-hidden size={20} />
        </Link>
        <span className="flex-1 text-center text-sm font-semibold text-ink-muted">Mon profil</span>
        <span className="w-11" />
      </header>
      <main className="flex flex-1 flex-col gap-5 px-5 pt-3 pb-8 text-base">
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface-raised p-5">
          <AvatarUpload companyId={company.id} member={member} />
          <dl className="flex flex-col gap-3 border-t border-hairline pt-4">
            <div><dt className="text-sm text-ink-muted">Nom</dt><dd className="font-semibold">{member.firstName} {member.lastName}</dd></div>
            <div><dt className="text-sm text-ink-muted">Rôle</dt><dd className="font-semibold">{ROLE_LABEL[member.role]} chez {company.name}</dd></div>
            {member.phone && <div><dt className="text-sm text-ink-muted">Portable</dt><dd className="font-semibold">{displayPhone(member.phone)}</dd></div>}
            <div>
              <dt className="text-sm text-ink-muted">Connexion</dt>
              <dd className="font-semibold">{member.email ?? "Ce téléphone (lien de votre gérant)"}</dd>
              {member.email && <dd><a href="/mot-de-passe-oublie" className="text-sm font-semibold text-azur">Changer mon mot de passe</a></dd>}
            </div>
          </dl>
          <p className="text-[13px] text-ink-muted">Une erreur dans votre nom ou votre numéro ? Votre gérant peut la corriger.</p>
        </section>
        <section className="flex items-center justify-between rounded-2xl border border-line bg-surface-raised p-5">
          <span className="font-semibold">Thème</span>
          <ThemeButton />
        </section>
        <section className="flex items-center justify-between rounded-2xl border border-line bg-surface-raised p-5">
          <span>
            <span className="block font-semibold">Se déconnecter</span>
            <span className="block text-[13px] text-ink-muted">{member.email ? "Vous vous reconnecterez avec votre e-mail et votre mot de passe." : "Il faudra un nouveau lien de votre gérant pour revenir."}</span>
          </span>
          <AgentSignOut action={signOut} />
        </section>
        {member.role !== "gerant" && (
          <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-raised p-5">
            <DeleteMyAccount />
          </section>
        )}
      </main>
    </>
  );
}
