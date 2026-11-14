import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileText,
  PhoneCall,
  Smartphone,
  Users,
} from "lucide-react";
import { LinkButton, Logo } from "@/components/ui";
import { ThemeButton } from "@/components/theme-toggle";
import { HeroDemo, LandingFx } from "@/components/landing-fx";
import { LandingPricing } from "@/components/landing-pricing";
import { legalReady } from "@/lib/legal";
import { TRADES } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "Swipo · Le suivi de chantiers des entreprises de nettoyage" },
  description:
    "Planning, missions des agents sur téléphone, photos avant/après, imprévus en direct et comptes rendus clients en PDF. Swipo simplifie le quotidien des entreprises de nettoyage.",
};

// Contenu statique : la page s'affiche instantanément.
export const dynamic = "force-static";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const PAINS = [
  { icon: PhoneCall, title: "Le téléphone sonne toute la journée", text: "« Tu en es où ? », « C'est quel code ? », « Le client n'est pas là »… Vous coordonnez au lieu de piloter." },
  { icon: Camera, title: "Les photos se perdent", text: "Elles dorment dans les téléphones et les conversations WhatsApp. Impossible de les retrouver quand un client conteste." },
  { icon: FileText, title: "Rien à montrer au client", text: "Le travail est bien fait, mais rien ne le prouve. Le compte rendu, on le fait le soir… ou jamais." },
];

const FEATURES = [
  { icon: CalendarDays, title: "Planning et équipe", text: "Créez un chantier en une minute, affectez vos agents, repérez les conflits d'agenda. Toute la semaine sur un seul écran." },
  { icon: Smartphone, title: "La mission dans la poche de l'agent", text: "Adresse, codes d'accès, consignes, checklist. L'agent démarre, prend ses photos avant/après et termine. Rien à installer." },
  { icon: BellRing, title: "Les imprévus en direct", text: "Portail fermé, produit manquant, dégât : vous êtes alerté aussitôt et vous décidez en un clic. L'agent voit votre réponse sans recharger." },
  { icon: ClipboardCheck, title: "Validation et reprises", text: "Contrôlez ce que vous voulez, validez plusieurs chantiers d'un coup, ou demandez une reprise avec le motif et la date." },
  { icon: FileText, title: "Un compte rendu client professionnel", text: "Un PDF à votre logo avec les photos avant/après, les travaux réalisés et vos réserves. À envoyer par e-mail ou WhatsApp. Offres Pro et Business." },
  { icon: CloudOff, title: "Même sans réseau", text: "Sous-sol, cave, parking : l'agent continue à travailler. Tout part tout seul, à l'heure réelle, dès que le réseau revient." },
];

const STEPS = [
  { n: "1", title: "Vous planifiez", text: "Le client, l'adresse, les consignes, l'agent. Le chantier apparaît sur son téléphone." },
  { n: "2", title: "L'équipe intervient", text: "Démarrage, checklist, photos, signalements : vous suivez tout en direct, sans appeler." },
  { n: "3", title: "Vous validez et envoyez", text: "Un coup d'œil, un clic, et le compte rendu part chez le client." },
];

const FAQ = [
  { q: "Faut-il installer une application ?", a: "Non. Swipo fonctionne dans le navigateur, sur ordinateur comme sur téléphone. Vos agents ouvrent simplement un lien." },
  { q: "Et si l'agent n'a pas de réseau ?", a: "Il continue normalement : ses missions du jour sont gardées sur son téléphone, et ce qu'il fait (photos, checklist, fin de chantier) part automatiquement au retour du réseau." },
  { q: "Est-ce adapté à une petite équipe ?", a: "Swipo est pensé pour les entreprises de 2 à 10 personnes : peu de réglages, des écrans clairs, l'essentiel et rien de plus." },
  { q: "Mes clients voient-ils mes notes internes ?", a: "Jamais. Le compte rendu client ne contient ni vos commentaires internes, ni les noms de vos agents. Vous choisissez les photos et le texte." },
  { q: "Mes données sont-elles protégées ?", a: "Elles sont hébergées en Europe, les photos sont privées, et chaque entreprise ne voit que ses propres données." },
  { q: "Combien de temps pour démarrer ?", a: "Quelques minutes : créez votre compte, ajoutez votre équipe et votre premier chantier. L'essai est gratuit pendant 14 jours, sans carte bancaire." },
];

const H2 = "font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] sm:text-[40px] sm:leading-[48px]";
const KICKER = "text-[13px] font-semibold tracking-[0.08em] text-azur";

export default function Home() {
  const headline = ["Vos", "chantiers", "suivis"];
  return (
    <div className="min-h-dvh overflow-x-clip">
      <LandingFx />

      {/* En-tête */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-md">
        <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Swipo, accueil" className="flex-none transition-transform hover:scale-[1.03]">
            <Logo height={28} />
          </Link>
          <div className="hidden flex-1 items-center gap-1 text-[15px] font-semibold text-ink-muted md:flex">
            {[
              ["#fonctionnalites", "Fonctionnalités"],
              ["#comment", "Comment ça marche"],
              ["#tarifs", "Tarifs"],
              ["#questions", "Questions"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="group relative rounded-lg px-3 py-2 transition-colors hover:text-ink">
                {label}
                <span className="absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-azur transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeButton />
            <Link href="/connexion" className="hidden h-11 items-center px-3 font-semibold text-ink transition-colors hover:text-azur sm:flex">Se connecter</Link>
            <LinkButton href="/inscription" className="shine">Essai gratuit</LinkButton>
          </div>
        </nav>
      </header>

      <main>
        {/* Accroche */}
        <section className="relative">
          <div aria-hidden className="glow pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_60%_at_72%_12%,var(--azur-soft),transparent_70%)]" />
          <div aria-hidden className="pointer-events-none absolute top-40 -left-24 size-72 rounded-full bg-soleil-soft opacity-60 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-16 px-4 pt-16 pb-28 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-24 lg:pb-32">
            <div className="flex flex-col items-start gap-6">
              <h1 className="font-display text-[40px] leading-[46px] font-semibold tracking-[-0.035em] sm:text-[56px] sm:leading-[62px]">
                {headline.map((w, k) => (
                  <span key={w} className="rise mr-[0.25em] inline-block" style={delay(80 + k * 90)}>{w}</span>
                ))}
                <span className="rise inline-block bg-gradient-to-r from-azur via-azur to-[#3aa0e6] bg-clip-text pb-1 text-transparent" style={delay(360)}>
                  d&apos;un geste.
                </span>
              </h1>
              <p className="rise max-w-[520px] text-[18px] leading-7 text-ink-muted" style={delay(480)}>
                Swipo réunit le planning, les missions de vos agents, les photos avant/après et les comptes rendus clients. Vous savez ce qui est fait, et vous pouvez le prouver.
              </p>
              <div className="rise flex flex-wrap items-center gap-3" style={delay(580)}>
                <LinkButton href="/inscription" className="shine group h-[52px] px-6 text-base hover:-translate-y-0.5 hover:shadow-hero">
                  Essayer gratuitement <ArrowRight aria-hidden size={18} className="transition-transform group-hover:translate-x-1" />
                </LinkButton>
                <LinkButton href="/connexion" variant="secondary" className="h-[52px] px-6 text-base hover:-translate-y-0.5">Se connecter</LinkButton>
              </div>
              <p className="rise flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted" style={delay(680)}>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> 14 jours d&apos;essai gratuit</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> Aucune application à installer</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden size={15} className="text-valide" /> Fonctionne sans réseau</span>
              </p>
            </div>
            <div className="rise" style={delay(300)}>
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* Métiers, en bandeau qui défile */}
        <section aria-label="Métiers" className="border-y border-line bg-surface-raised">
          <div className="mx-auto flex max-w-[1180px] items-center gap-8 px-4 py-6 sm:px-6">
            <span className="flex-none text-sm font-semibold text-ink-muted">Conçu pour</span>
            <div className="marquee-wrap min-w-0 flex-1 overflow-hidden">
              <div className="marquee flex w-max gap-10">
                {[...TRADES, ...TRADES].map((t, k) => (
                  <span key={k} aria-hidden={k >= TRADES.length || undefined} className="flex items-center gap-10 font-display text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-ink">
                    {t.label}
                    <span aria-hidden className="size-1.5 rounded-full bg-azur/40" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Constat */}
        <section className="mx-auto max-w-[1180px] px-4 py-24 sm:px-6">
          <div data-reveal className="max-w-[640px]">
            <p className={KICKER}>LE QUOTIDIEN D&apos;UN GÉRANT</p>
            <h2 className={`mt-3 ${H2}`}>Vous êtes sur le terrain, au téléphone et au bureau. En même temps.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAINS.map((p, k) => (
              <div
                key={p.title}
                data-reveal
                style={delay(k * 120)}
                className="spot group flex flex-col gap-3 rounded-xl border border-line bg-surface-raised p-7 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-soleil/50 hover:shadow-hero"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-soleil-soft text-soleil-ink transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <p.icon aria-hidden size={20} />
                </span>
                <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{p.title}</h3>
                <p className="text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-20 bg-surface-raised py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
            <div data-reveal className="mx-auto max-w-[680px] text-center">
              <p className={KICKER}>FONCTIONNALITÉS</p>
              <h2 className={`mt-3 ${H2}`}>Tout le suivi de vos chantiers, du planning au compte rendu.</h2>
              <p className="mt-4 text-[17px] text-ink-muted">Un espace gérant sur ordinateur, un espace agent sur téléphone. Les deux se parlent en direct.</p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, k) => (
                <div
                  key={f.title}
                  data-reveal
                  style={delay((k % 3) * 110)}
                  className="spot group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-8 transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1.5 hover:border-azur/40 hover:bg-surface-raised hover:shadow-hero"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-azur-subtle text-azur transition-all duration-300 group-hover:scale-110 group-hover:bg-azur group-hover:text-on-azur group-hover:shadow-card">
                    <f.icon aria-hidden size={21} />
                  </span>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.01em]">{f.title}</h3>
                  <p className="text-ink-muted">{f.text}</p>
                  <span aria-hidden className="mt-auto h-0.5 w-10 origin-left scale-x-0 rounded-full bg-azur transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-24 sm:px-6">
          <div data-reveal className="max-w-[640px]">
            <p className={KICKER}>COMMENT ÇA MARCHE</p>
            <h2 className={`mt-3 ${H2}`}>Trois étapes, chaque jour.</h2>
          </div>
          <div data-reveal className="relative mt-12">
            <span aria-hidden className="steps-line absolute top-[52px] right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-azur/10 via-azur/50 to-azur/10 md:block" />
            <ol className="relative grid gap-5 md:grid-cols-3">
              {STEPS.map((s, k) => (
                <li
                  key={s.n}
                  style={delay(k * 160)}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-line bg-surface-raised p-7 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-hero md:items-center md:text-center"
                >
                  <span className="flex size-12 items-center justify-center rounded-full border-2 border-azur/30 bg-surface-raised font-display text-lg font-semibold text-azur transition-all duration-300 group-hover:scale-110 group-hover:border-azur group-hover:bg-azur group-hover:text-on-azur">
                    {s.n}
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{s.title}</h3>
                  <p className="text-ink-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Objectif */}
        <section className="px-4 sm:px-6">
          <div data-reveal className="group relative mx-auto flex max-w-[1180px] flex-col items-start gap-6 overflow-hidden rounded-2xl bg-ink px-8 py-14 text-on-ink sm:px-14 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-azur/30 blur-3xl transition-transform duration-1000 group-hover:translate-x-[-40px] group-hover:translate-y-[30px]" />
            <span className="relative flex size-12 items-center justify-center rounded-full bg-on-ink/10"><Users aria-hidden size={22} /></span>
            <p className="relative max-w-[820px] font-display text-[26px] leading-[36px] font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[44px]">
              Notre objectif : que vous passiez moins de temps au téléphone, et plus de temps à faire grandir votre entreprise.
            </p>
            <p className="relative max-w-[640px] text-[17px] leading-7 opacity-75">
              Swipo est né à Nice, chez un gérant d&apos;entreprise de nettoyage de vitres. Chaque écran a été pensé à partir du terrain : des gestes simples pour les agents, une vue claire pour le gérant, et une preuve de qualité pour le client.
            </p>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-20 bg-surface-raised py-24">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-4 sm:px-6">
            <div data-reveal className="mx-auto max-w-[640px] text-center">
              <p className={KICKER}>TARIFS</p>
              <h2 className={`mt-3 ${H2}`}>Un prix par entreprise, pas par salarié.</h2>
              <p className="mt-4 text-[17px] text-ink-muted">Invitez toute votre équipe sans y réfléchir. 14 jours d&apos;essai gratuit, sans carte bancaire.</p>
            </div>
            <LandingPricing />
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="mx-auto max-w-[860px] scroll-mt-20 px-4 py-24 sm:px-6">
          <div data-reveal>
            <p className={`text-center ${KICKER}`}>QUESTIONS</p>
            <h2 className={`mt-3 text-center ${H2}`}>Vous vous demandez peut-être…</h2>
          </div>
          <div className="mt-12 flex flex-col gap-3">
            {FAQ.map((f, k) => (
              <details
                key={f.q}
                data-reveal
                style={delay(k * 60)}
                className="faq group rounded-xl border border-line bg-surface-raised px-6 py-5 shadow-card transition-[border-color,box-shadow] duration-300 hover:border-azur/40 hover:shadow-hero open:border-azur/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-semibold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="flex size-7 flex-none items-center justify-center rounded-full bg-hairline text-ink-muted transition-all duration-300 group-hover:bg-azur-subtle group-hover:text-azur group-open:rotate-45 group-open:bg-azur group-open:text-on-azur">+</span>
                </summary>
                <p className="mt-3 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final */}
        <section className="px-4 pb-24 sm:px-6">
          <div data-reveal className="group relative mx-auto flex max-w-[1180px] flex-col items-center gap-6 overflow-hidden rounded-2xl bg-azur px-8 py-16 text-center text-on-azur">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-on-azur/10 transition-transform duration-1000 group-hover:scale-125" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-on-azur/10 transition-transform duration-1000 group-hover:scale-125" />
            <h2 className={`relative max-w-[640px] ${H2}`}>Un geste, tout est net.</h2>
            <p className="relative max-w-[520px] text-[17px] opacity-85">Créez votre espace en quelques minutes et suivez votre premier chantier dès aujourd&apos;hui.</p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Link href="/inscription" className="shine group/b inline-flex h-[52px] items-center gap-2 rounded-md bg-on-azur px-6 text-base font-semibold text-azur transition-transform hover:-translate-y-0.5">
                Essayer gratuitement <ArrowRight aria-hidden size={18} className="transition-transform group-hover/b:translate-x-1" />
              </Link>
              <Link href="/connexion" className="inline-flex h-[52px] items-center rounded-md border border-on-azur/40 px-6 text-base font-semibold transition-colors hover:bg-on-azur/10">
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
            <Link href="/connexion" className="transition-colors hover:text-azur">Connexion gérant</Link>
            <Link href="/agent/connexion" className="transition-colors hover:text-azur">Connexion agent</Link>
            <Link href="/inscription" className="transition-colors hover:text-azur">Créer un compte</Link>
            {legalReady && (
              <>
                <Link href="/mentions-legales" className="transition-colors hover:text-azur">Mentions légales</Link>
                <Link href="/conditions" className="transition-colors hover:text-azur">Conditions</Link>
                <Link href="/confidentialite" className="transition-colors hover:text-azur">Confidentialité</Link>
              </>
            )}
          </nav>
          <p className="w-full text-[13px] text-ink-muted">© {new Date().getFullYear()} Swipo</p>
        </div>
      </footer>
    </div>
  );
}
