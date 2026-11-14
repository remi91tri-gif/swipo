import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  MessageSquareWarning,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { LinkButton, Logo } from "@/components/ui";
import { ThemeButton } from "@/components/theme-toggle";
import { TRADES } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "Swipo · Le suivi de chantiers des entreprises de nettoyage" },
  description:
    "Planning, missions des agents sur téléphone, photos avant/après, imprévus et comptes rendus clients en PDF. Swipo simplifie le quotidien des entreprises de nettoyage.",
};

// Contenu statique : la page s'affiche instantanément.
export const dynamic = "force-static";

const PAINS = [
  { icon: PhoneCall, title: "Le téléphone sonne toute la journée", text: "« Tu en es où ? », « C'est quel code ? », « Le client n'est pas là »… Vous coordonnez au lieu de piloter." },
  { icon: Camera, title: "Les photos se perdent", text: "Elles dorment dans les téléphones et les conversations WhatsApp. Impossible de les retrouver quand un client conteste." },
  { icon: FileText, title: "Rien à montrer au client", text: "Le travail est bien fait, mais rien ne le prouve. Le compte rendu, on le fait le soir… ou jamais." },
];

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Planning et équipe",
    text: "Créez un chantier en une minute, affectez vos agents, repérez les conflits d'agenda. Toute la semaine sur un seul écran.",
  },
  {
    icon: Smartphone,
    title: "La mission dans la poche de l'agent",
    text: "Adresse, codes d'accès, consignes, checklist. L'agent démarre, prend ses photos avant/après et termine. Rien à installer.",
  },
  {
    icon: MessageSquareWarning,
    title: "Les imprévus réglés en un clic",
    text: "Portail fermé, produit manquant, dégât : l'agent signale, vous décidez (continuer, attendre, reprogrammer). Il voit votre réponse aussitôt.",
  },
  {
    icon: ClipboardCheck,
    title: "Validation et reprises",
    text: "Contrôlez ce que vous voulez, validez plusieurs chantiers d'un coup, ou demandez une reprise avec le motif et la date.",
  },
  {
    icon: FileText,
    title: "Un compte rendu client professionnel",
    text: "Un PDF à votre logo avec les photos avant/après, les travaux réalisés et vos réserves. À envoyer par e-mail ou WhatsApp.",
  },
  {
    icon: ShieldCheck,
    title: "Vos données protégées",
    text: "Hébergement en Europe, photos privées, et chaque entreprise ne voit que ses propres données.",
  },
];

const STEPS = [
  { n: "1", title: "Vous planifiez", text: "Le client, l'adresse, les consignes, l'agent. Le chantier apparaît sur son téléphone." },
  { n: "2", title: "L'équipe intervient", text: "Démarrage, checklist, photos, signalements : vous suivez tout en direct, sans appeler." },
  { n: "3", title: "Vous validez et envoyez", text: "Un coup d'œil, un clic, et le compte rendu part chez le client." },
];

const FAQ = [
  { q: "Faut-il installer une application ?", a: "Non. Swipo fonctionne dans le navigateur, sur ordinateur comme sur téléphone. Vos agents ouvrent simplement un lien." },
  { q: "Est-ce adapté à une petite équipe ?", a: "Swipo est pensé pour les entreprises de 2 à 10 personnes : peu de réglages, des écrans clairs, l'essentiel et rien de plus." },
  { q: "Mes clients voient-ils mes notes internes ?", a: "Jamais. Le compte rendu client ne contient ni vos commentaires internes, ni les noms de vos agents. Vous choisissez les photos et le texte." },
  { q: "Combien de temps pour démarrer ?", a: "Quelques minutes : créez votre compte, ajoutez votre équipe et votre premier chantier. L'essai est gratuit pendant 30 jours." },
];

const JOBS = [
  { time: "08:00", title: "Vitrerie · Boulangerie du Port", who: "Karim", pill: "Validé", tone: "bg-valide-soft text-valide" },
  { time: "10:30", title: "Remise en état · Rue Barla", who: "Inès, Yanis", pill: "En cours", tone: "bg-azur-soft text-azur" },
  { time: "14:00", title: "Fin de chantier · Villa Arson", who: "Karim", pill: "À traiter", tone: "bg-critique-soft text-critique" },
  { time: "16:30", title: "Vitrerie · Cabinet Masséna", who: "Yanis", pill: "Planifié", tone: "bg-neutral-soft text-ink-muted" },
];

function ProductPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[640px] select-none">
      {/* Écran du gérant */}
      <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-hero sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted">AUJOURD&apos;HUI</p>
            <p className="font-display text-lg font-semibold tracking-[-0.01em]">Bonjour Marc</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-critique-soft text-critique">
            <Bell size={16} />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            ["4", "prévus"],
            ["1", "en cours"],
            ["1", "à traiter"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-lg bg-surface px-3 py-2.5">
              <p className="font-display text-xl font-semibold">{n}</p>
              <p className="text-[12px] text-ink-muted">{l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 flex flex-col lg:pr-32">
          {JOBS.map((j) => (
            <li key={j.time} className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
              <span className="w-11 text-[13px] font-semibold text-ink-muted tabular-nums">{j.time}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{j.title}</span>
                <span className="block text-[12px] text-ink-muted">{j.who}</span>
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${j.tone}`}>{j.pill}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Téléphone de l'agent */}
      <div className="absolute -right-16 -bottom-14 hidden w-[210px] rounded-[30px] border border-line-strong bg-surface p-2.5 shadow-hero lg:block">
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-surface-raised p-3.5">
          <p className="text-center text-[11px] font-semibold text-ink-muted">10:30 · En cours</p>
          <p className="font-display text-[15px] leading-5 font-semibold">Remise en état après locataire</p>
          <p className="flex gap-1.5 text-[12px] text-ink-muted"><MapPin size={13} className="mt-0.5 flex-none" /> 27 rue Barla, Nice</p>
          <div className="grid grid-cols-2 gap-1.5">
            <span className="flex flex-col items-center gap-1 rounded-lg bg-azur-subtle py-2 text-[11px] font-semibold text-azur"><Camera size={14} /> Avant · 3</span>
            <span className="flex flex-col items-center gap-1 rounded-lg bg-azur-subtle py-2 text-[11px] font-semibold text-azur"><Camera size={14} /> Après · 2</span>
          </div>
          {["Cuisine", "Salle de bain", "Sols"].map((t, i) => (
            <span key={t} className="flex items-center gap-2 text-[12px]">
              <span className={`flex size-4 items-center justify-center rounded-full ${i < 2 ? "bg-valide text-on-ink" : "border-2 border-line-strong"}`}>{i < 2 && <Check size={9} strokeWidth={3.5} />}</span>
              {t}
            </span>
          ))}
          <span className="mt-1 flex h-9 items-center justify-center rounded-lg bg-azur text-[13px] font-semibold text-on-azur">Terminer</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      {/* En-tête */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/85 backdrop-blur-md">
        <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Swipo, accueil" className="flex-none">
            <Logo height={28} />
          </Link>
          <div className="hidden flex-1 items-center gap-6 text-[15px] font-semibold text-ink-muted md:flex">
            <a href="#fonctionnalites" className="hover:text-ink">Fonctionnalités</a>
            <a href="#comment" className="hover:text-ink">Comment ça marche</a>
            <a href="#questions" className="hover:text-ink">Questions</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeButton />
            <Link href="/connexion" className="hidden h-11 items-center px-3 font-semibold text-ink hover:text-azur sm:flex">Se connecter</Link>
            <LinkButton href="/inscription">Essai gratuit</LinkButton>
          </div>
        </nav>
      </header>

      <main>
        {/* Accroche */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(60%_60%_at_70%_10%,var(--azur-soft),transparent_70%)] opacity-80" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-16 px-4 pt-16 pb-28 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-24 lg:pb-32">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-raised px-3.5 py-1.5 text-[13px] font-semibold text-ink-muted">
                <span className="size-1.5 rounded-full bg-soleil" /> Pour les entreprises de nettoyage de 2 à 10 personnes
              </span>
              <h1 className="font-display text-[40px] leading-[46px] font-semibold tracking-[-0.035em] sm:text-[56px] sm:leading-[62px]">
                Vos chantiers suivis <span className="text-azur">d&apos;un geste.</span>
              </h1>
              <p className="max-w-[520px] text-[18px] leading-7 text-ink-muted">
                Swipo réunit le planning, les missions de vos agents, les photos avant/après et les comptes rendus clients. Vous savez ce qui est fait, et vous pouvez le prouver.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <LinkButton href="/inscription" className="h-[52px] px-6 text-base">
                  Essayer gratuitement <ArrowRight aria-hidden size={18} />
                </LinkButton>
                <LinkButton href="/connexion" variant="secondary" className="h-[52px] px-6 text-base">Se connecter</LinkButton>
              </div>
              <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> 30 jours d&apos;essai</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> Aucune application à installer</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> Données en Europe</span>
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Métiers */}
        <section aria-label="Métiers" className="border-y border-line bg-surface-raised">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-7 sm:px-6">
            <span className="text-sm font-semibold text-ink-muted">Conçu pour</span>
            {TRADES.map((t) => (
              <span key={t.id} className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{t.label}</span>
            ))}
          </div>
        </section>

        {/* Constat */}
        <section className="mx-auto max-w-[1180px] px-4 py-24 sm:px-6">
          <div className="max-w-[640px]">
            <p className="text-[13px] font-semibold tracking-[0.08em] text-azur">LE QUOTIDIEN D&apos;UN GÉRANT</p>
            <h2 className="mt-3 font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]">
              Vous êtes sur le terrain, au téléphone et au bureau. En même temps.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-raised p-7 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-full bg-soleil-soft text-soleil-ink"><p.icon aria-hidden size={20} /></span>
                <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{p.title}</h3>
                <p className="text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-20 bg-surface-raised py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
            <div className="mx-auto max-w-[680px] text-center">
              <p className="text-[13px] font-semibold tracking-[0.08em] text-azur">FONCTIONNALITÉS</p>
              <h2 className="mt-3 font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]">
                Tout le suivi de vos chantiers, du planning au compte rendu.
              </h2>
              <p className="mt-4 text-[17px] text-ink-muted">Un espace gérant sur ordinateur, un espace agent sur téléphone. Les deux se parlent en direct.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col gap-3 bg-surface-raised p-8">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-azur-subtle text-azur"><f.icon aria-hidden size={20} /></span>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.01em]">{f.title}</h3>
                  <p className="text-ink-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="max-w-[640px]">
            <p className="text-[13px] font-semibold tracking-[0.08em] text-azur">COMMENT ÇA MARCHE</p>
            <h2 className="mt-3 font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]">Trois étapes, chaque jour.</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex flex-col gap-3 rounded-xl border border-line bg-surface-raised p-7 shadow-card">
                <span className="font-display text-[44px] leading-none font-semibold text-azur/25">{s.n}</span>
                <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Objectif */}
        <section className="px-4 sm:px-6">
          <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-6 rounded-2xl bg-ink px-8 py-14 text-on-ink sm:px-14 sm:py-16">
            <span className="flex size-12 items-center justify-center rounded-full bg-on-ink/10"><Users aria-hidden size={22} /></span>
            <p className="max-w-[820px] font-display text-[26px] leading-[36px] font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[44px]">
              Notre objectif : que vous passiez moins de temps au téléphone, et plus de temps à faire grandir votre entreprise.
            </p>
            <p className="max-w-[640px] text-[17px] leading-7 opacity-75">
              Swipo est né à Nice, chez un gérant d&apos;entreprise de nettoyage de vitres. Chaque écran a été pensé à partir du terrain : des gestes simples pour les agents, une vue claire pour le gérant, et une preuve de qualité pour le client.
            </p>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="mx-auto max-w-[860px] scroll-mt-20 px-4 py-24 sm:px-6">
          <p className="text-center text-[13px] font-semibold tracking-[0.08em] text-azur">QUESTIONS</p>
          <h2 className="mt-3 text-center font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]">Vous vous demandez peut-être…</h2>
          <div className="mt-12 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-line bg-surface-raised px-6 py-5 shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-semibold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="flex size-7 flex-none items-center justify-center rounded-full bg-hairline text-ink-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto flex max-w-[1180px] flex-col items-center gap-6 overflow-hidden rounded-2xl bg-azur px-8 py-16 text-center text-on-azur">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-on-azur/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-on-azur/10" />
            <h2 className="relative max-w-[640px] font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]">Un geste, tout est net.</h2>
            <p className="relative max-w-[520px] text-[17px] opacity-85">Créez votre espace en quelques minutes et suivez votre premier chantier dès aujourd&apos;hui.</p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Link href="/inscription" className="inline-flex h-[52px] items-center gap-2 rounded-md bg-on-azur px-6 text-base font-semibold text-azur hover:opacity-90">
                Essayer gratuitement <ArrowRight aria-hidden size={18} />
              </Link>
              <Link href="/connexion" className="inline-flex h-[52px] items-center rounded-md border border-on-azur/40 px-6 text-base font-semibold hover:bg-on-azur/10">
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-2">
            <Logo height={24} />
            <p className="text-sm text-ink-muted">Le suivi de chantiers des entreprises de nettoyage.</p>
          </div>
          <nav aria-label="Liens du pied de page" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-muted">
            <Link href="/connexion" className="hover:text-ink">Connexion gérant</Link>
            <Link href="/agent/connexion" className="hover:text-ink">Connexion agent</Link>
            <Link href="/inscription" className="hover:text-ink">Créer un compte</Link>
          </nav>
          <p className="w-full text-[13px] text-ink-muted">© {new Date().getFullYear()} Swipo</p>
        </div>
      </footer>
    </div>
  );
}
