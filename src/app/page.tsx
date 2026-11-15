import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AlertCircle, ArrowRight, Camera, Check, CheckCircle2, FileText, ShieldCheck, MapPin, RotateCcw, CalendarDays } from "lucide-react";
import { LinkButton, Logo } from "@/components/ui";
import { ThemeButton } from "@/components/theme-toggle";
import { HeroDemo, LandingFx } from "@/components/landing-fx";
import { LandingPricing } from "@/components/landing-pricing";
import { MobileCta, MobileMenu } from "@/components/landing-mobile";
import { legalReady } from "@/lib/legal";

export const metadata: Metadata = {
  title: { absolute: "Swipo · Le suivi de chantiers des entreprises de nettoyage" },
  description:
    "Planning, missions des agents sur téléphone, photos avant/après, imprévus en direct et comptes rendus clients en PDF. Swipo simplifie le quotidien des entreprises de nettoyage.",
};

// Contenu statique : la page s'affiche instantanément.
export const dynamic = "force-static";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const FAQ = [
  { q: "Faut-il installer une application ?", a: "Non. Swipo fonctionne dans le navigateur, sur ordinateur comme sur téléphone. Vos agents ouvrent simplement un lien." },
  { q: "Et si l'agent n'a pas de réseau ?", a: "Il continue normalement. Ce qu'il fait (photos, checklist, fin de chantier) part tout seul au retour du réseau." },
  { q: "Est-ce adapté à une petite équipe ?", a: "Swipo est pensé pour les entreprises de 2 à 10 personnes : peu de réglages, des écrans clairs, l'essentiel." },
  { q: "Mes clients voient-ils mes notes internes ?", a: "Jamais. Le compte rendu ne contient ni vos commentaires internes, ni les noms de vos agents." },
  { q: "Mes données sont-elles protégées ?", a: "Hébergées en Europe, photos privées, et chaque entreprise ne voit que ses propres données." },
  { q: "Combien de temps pour démarrer ?", a: "Quelques minutes. L'essai est gratuit pendant 14 jours, sans carte bancaire." },
];

const H2 = "font-display text-[30px] leading-[36px] font-semibold tracking-[-0.03em] sm:text-[44px] sm:leading-[52px]";
const LEAD = "text-[17px] leading-7 text-ink-muted sm:text-[19px] sm:leading-8";

/** Une section « produit » : texte d'un côté, visuel de l'autre. */
function Showcase({ id, kicker, title, text, points, visual, flip }: { id?: string; kicker: string; title: string; text: string; points: string[]; visual: ReactNode; flip?: boolean }) {
  return (
    <section id={id} className="mx-auto grid max-w-[1120px] scroll-mt-20 items-center gap-10 px-5 py-16 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-20">
      <div data-reveal className={flip ? "lg:order-2" : ""}>
        <p className="text-sm font-semibold text-azur">{kicker}</p>
        <h2 className={`mt-3 ${H2}`}>{title}</h2>
        <p className={`mt-5 ${LEAD}`}>{text}</p>
        <ul className="mt-7 flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[16px]">
              <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-azur-subtle text-azur"><Check aria-hidden size={12} strokeWidth={3} /></span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal style={delay(120)} aria-hidden className={`select-none ${flip ? "lg:order-1" : ""}`}>
        {visual}
      </div>
    </section>
  );
}

/** Fond doux des visuels. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-azur-subtle to-surface px-6 py-10 sm:min-h-[420px]">
      {children}
    </div>
  );
}

function PhoneVisual() {
  return (
    <Stage>
      <div className="w-[248px] rounded-[38px] border border-line-strong bg-surface p-3 shadow-hero">
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface-raised p-4">
          <p className="text-center text-[11px] font-semibold text-ink-muted">10:30 · En cours</p>
          <p className="font-display text-[17px] leading-6 font-semibold">Remise en état après locataire</p>
          <p className="flex gap-1.5 text-[12px] text-ink-muted"><MapPin size={13} className="mt-0.5 flex-none" /> 27 rue Barla, Nice · code 4512B</p>
          <div className="grid grid-cols-2 gap-2">
            {["Avant · 3", "Après · 2"].map((l) => (
              <span key={l} className="flex flex-col items-center gap-1 rounded-xl bg-azur-subtle py-3 text-[11px] font-semibold text-azur"><Camera size={15} />{l}</span>
            ))}
          </div>
          {[["Cuisine", true], ["Salle de bain", true], ["Sols et plinthes", false]].map(([t, on]) => (
            <span key={t as string} className="flex items-center gap-2.5 text-[13px]">
              <span className={`flex size-[18px] items-center justify-center rounded-full ${on ? "bg-valide text-on-ink" : "border-2 border-line-strong"}`}>{on && <Check size={10} strokeWidth={3.5} />}</span>
              <span className={on ? "text-ink-muted line-through decoration-ink-muted/40" : ""}>{t as string}</span>
            </span>
          ))}
          <span className="mt-1 flex h-10 items-center justify-center rounded-xl bg-azur text-[14px] font-semibold text-on-azur">Terminer</span>
        </div>
      </div>
    </Stage>
  );
}

function AlertVisual() {
  return (
    <Stage>
      <div className="flex w-full max-w-[380px] flex-col gap-3">
        <div className="float flex items-start gap-3 rounded-2xl border border-line bg-surface-raised p-4 shadow-hero">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-critique-soft text-critique"><AlertCircle size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex justify-between text-[15px] font-semibold">Imprévu bloquant <span className="text-[12px] font-normal text-ink-muted">à l&apos;instant</span></span>
            <span className="block text-[13px] text-ink-muted">Villa Arson : le portail est fermé</span>
            <span className="mt-3 flex gap-2">
              <span className="rounded-lg bg-azur px-3 py-1.5 text-[12px] font-semibold text-on-azur">J&apos;appelle le client</span>
              <span className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold">Reporter</span>
            </span>
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-raised p-4 opacity-90 shadow-card">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-valide-soft text-valide"><CheckCircle2 size={17} /></span>
          <span className="text-[13px]"><span className="block text-[15px] font-semibold">Chantier terminé</span><span className="text-ink-muted">Boulangerie du Port · 6 photos</span></span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-raised p-4 opacity-75 shadow-card">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-reprise-soft text-reprise"><RotateCcw size={17} /></span>
          <span className="text-[13px]"><span className="block text-[15px] font-semibold">Reprise planifiée</span><span className="text-ink-muted">Cabinet Masséna · jeudi 9:00</span></span>
        </div>
      </div>
    </Stage>
  );
}

function ReportVisual() {
  return (
    <Stage>
      <div className="w-full max-w-[340px] -rotate-2 rounded-xl border border-line bg-white p-6 text-[#12202b] shadow-hero transition-transform duration-500 hover:rotate-0">
        <div className="flex items-center justify-between">
          <span className="font-display text-[15px] font-semibold">Azur Nettoyage</span>
          <span className="text-[10px] text-[#6b7785]">12 nov. 2026</span>
        </div>
        <p className="mt-4 font-display text-[19px] leading-6 font-semibold">Compte rendu d&apos;intervention</p>
        <p className="mt-1 text-[11px] text-[#6b7785]">Remise en état · 27 rue Barla, Nice</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Avant", "Après"].map((l, k) => (
            <span key={l} className={`flex h-20 items-end rounded-md p-1.5 text-[10px] font-semibold text-white ${k ? "bg-gradient-to-br from-[#7cc4f5] to-[#1663a6]" : "bg-gradient-to-br from-[#b9a68a] to-[#6e5f4b]"}`}>{l}</span>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-1.5 text-[11px]">
          {["Vitres intérieures et extérieures", "Cuisine dégraissée", "Sols lavés"].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><Check size={11} className="text-[#1f7a4d]" strokeWidth={3} />{t}</span>
          ))}
        </div>
        <span className="mt-5 flex items-center gap-1.5 text-[10px] text-[#6b7785]"><FileText size={11} /> PDF à votre logo · prêt à envoyer</span>
      </div>
    </Stage>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <LandingFx />

      {/* En-tête */}
      <header className="sticky top-0 z-20 bg-surface/75 backdrop-blur-xl">
        <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-5 sm:px-6">
          <Link href="/" aria-label="Swipo, accueil" className="flex-none">
            <Logo height={26} />
          </Link>
          <div className="hidden flex-1 justify-center gap-8 text-[15px] text-ink-muted md:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-ink">Produit</a>
            <a href="#tarifs" className="transition-colors hover:text-ink">Tarifs</a>
            <a href="#questions" className="transition-colors hover:text-ink">Questions</a>
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link href="/agent/connexion" className="hidden h-10 items-center px-3 text-[15px] text-ink-muted transition-colors hover:text-ink lg:flex">Espace agent</Link>
            <Link href="/connexion" className="hidden h-10 items-center px-3 text-[15px] font-semibold text-ink transition-colors hover:text-azur sm:flex">Se connecter</Link>
            <LinkButton href="/inscription" className="h-10 rounded-full px-5 max-sm:hidden">Essai gratuit</LinkButton>
            <MobileMenu />
          </div>
        </nav>
      </header>

      <main>
        {/* Accroche */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_55%_at_50%_0%,var(--azur-subtle),transparent_75%)]" />
          <div className="relative mx-auto flex max-w-[1120px] flex-col items-center px-5 pt-14 text-center sm:px-6 sm:pt-24">
            <h1 className="rise max-w-[860px] font-display text-[44px] leading-[48px] font-semibold tracking-[-0.045em] sm:text-[76px] sm:leading-[80px]" style={delay(60)}>
              Vos chantiers suivis <span className="text-azur">d&apos;un geste.</span>
            </h1>
            <p className={`rise mt-6 max-w-[600px] ${LEAD}`} style={delay(200)}>
              Le planning, les missions de vos agents, les photos avant/après et les comptes rendus clients. Au même endroit.
            </p>
            <div className="rise mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row" style={delay(320)}>
              <LinkButton href="/inscription" className="shine group h-[54px] w-full rounded-full px-7 text-base sm:w-auto">
                Essayer gratuitement <ArrowRight aria-hidden size={18} className="transition-transform group-hover:translate-x-1" />
              </LinkButton>
              <a href="#fonctionnalites" className="inline-flex h-[54px] items-center px-5 text-base font-semibold text-ink transition-colors hover:text-azur">
                Voir comment ça marche
              </a>
            </div>
            <p className="rise mt-5 text-sm text-ink-muted" style={delay(420)}>14 jours gratuits · sans carte bancaire · rien à installer</p>
            <div className="rise mt-14 w-full max-w-[880px] text-left sm:mt-20" style={delay(380)}>
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* Trois promesses */}
        <section className="mx-auto max-w-[1120px] px-5 pt-20 pb-6 sm:px-6 sm:pt-28 lg:pt-52">
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              { icon: CalendarDays, t: "Planifiez en une minute", d: "Client, adresse, consignes, agent : la mission arrive sur son téléphone." },
              { icon: CheckCircle2, t: "Suivez sans appeler", d: "Démarrage, photos, imprévus, fin de chantier : tout remonte en direct." },
              { icon: FileText, t: "Prouvez la qualité", d: "Un compte rendu à votre logo, avec les photos avant/après, en un clic." },
            ].map((x, k) => (
              <div key={x.t} data-reveal style={delay(k * 100)} className="flex flex-col gap-3 sm:border-l sm:border-line sm:pl-8 sm:first:border-l-0 sm:first:pl-0">
                <x.icon aria-hidden size={22} className="text-azur" />
                <h3 className="font-display text-[19px] font-semibold tracking-[-0.015em]">{x.t}</h3>
                <p className="text-ink-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        <Showcase
          id="fonctionnalites"
          kicker="Pour vos agents"
          title="La mission dans leur poche."
          text="Un lien suffit : pas d'application, pas de mot de passe. L'agent retrouve sa journée, démarre, coche, photographie et termine."
          points={["Adresse, codes d'accès et consignes", "Photos avant/après obligatoires si vous le souhaitez", "Fonctionne même sans réseau, en sous-sol ou en cave"]}
          visual={<PhoneVisual />}
        />
        <Showcase
          flip
          kicker="Pour vous"
          title="Les imprévus, en direct."
          text="Portail fermé, produit manquant, dégât : vous êtes alerté tout de suite et vous décidez en un clic. L'agent voit votre réponse aussitôt."
          points={["Notifications sur ordinateur et téléphone", "Validation de plusieurs chantiers d'un coup", "Reprise demandée avec le motif et la date"]}
          visual={<AlertVisual />}
        />
        <Showcase
          kicker="Pour vos clients"
          title="Un compte rendu qui fait pro."
          text="Un PDF propre, à votre logo, avec les photos avant/après et les travaux réalisés. Vos notes internes et les noms de vos agents n'y figurent jamais."
          points={["Prêt à envoyer par e-mail ou WhatsApp", "Vous choisissez les photos et le texte", "Inclus dans les offres Pro et Business"]}
          visual={<ReportVisual />}
        />

        {/* Origine */}
        <section className="mx-auto max-w-[860px] px-5 py-16 text-center sm:px-6 sm:py-28">
          <p data-reveal className="font-display text-[26px] leading-[34px] font-semibold tracking-[-0.025em] sm:text-[36px] sm:leading-[46px]">
            « Moins de temps au téléphone, plus de temps pour faire grandir l&apos;entreprise. »
          </p>
          <p data-reveal style={delay(100)} className="mt-5 text-ink-muted">
            Swipo est né à Nice, chez un gérant d&apos;entreprise de nettoyage de vitres.
          </p>
          <p data-reveal style={delay(160)} className="mt-8 inline-flex items-center gap-2 text-sm text-ink-muted">
            <ShieldCheck aria-hidden size={15} /> Données hébergées en Europe · photos privées
          </p>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-20 border-t border-line/70 py-16 sm:py-28">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-5 sm:gap-14 sm:px-6">
            <div data-reveal className="mx-auto max-w-[640px] text-center">
              <h2 className={H2}>Un prix par entreprise.</h2>
              <p className={`mt-4 ${LEAD}`}>Pas par salarié. 14 jours d&apos;essai gratuit, sans carte bancaire.</p>
            </div>
            <LandingPricing />
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="mx-auto max-w-[1120px] scroll-mt-20 border-t border-line/70 px-5 py-16 sm:px-6 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <h2 data-reveal className={H2}>Questions fréquentes</h2>
            <div className="flex flex-col">
              {FAQ.map((f) => (
                <details key={f.q} data-reveal className="faq group border-b border-line py-5 first:pt-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="flex-none text-[22px] leading-none font-light text-ink-muted transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="px-5 pb-16 sm:px-6 sm:pb-24">
          <div data-reveal className="relative mx-auto flex max-w-[1120px] flex-col items-center overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-center text-on-ink sm:py-24">
            <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-azur/35 blur-3xl" />
            <h2 className={`relative max-w-[640px] ${H2}`}>Un geste, tout est net.</h2>
            <p className="relative mt-4 max-w-[480px] text-[17px] opacity-75">Créez votre espace en quelques minutes et suivez votre premier chantier dès aujourd&apos;hui.</p>
            <Link href="/inscription" className="shine group relative mt-9 inline-flex h-[54px] items-center justify-center gap-2 rounded-full bg-on-ink px-7 text-base font-semibold text-ink transition-transform hover:-translate-y-0.5">
              Essayer gratuitement <ArrowRight aria-hidden size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 max-md:pb-24">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo height={22} />
            <span className="text-[13px] text-ink-muted">© {new Date().getFullYear()}</span>
          </div>
          <nav aria-label="Liens du pied de page" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <Link href="/connexion" className="transition-colors hover:text-ink">Connexion gérant</Link>
            <Link href="/agent/connexion" className="transition-colors hover:text-ink">Connexion agent</Link>
            {legalReady && (
              <>
                <Link href="/mentions-legales" className="transition-colors hover:text-ink">Mentions légales</Link>
                <Link href="/conditions" className="transition-colors hover:text-ink">Conditions</Link>
                <Link href="/confidentialite" className="transition-colors hover:text-ink">Confidentialité</Link>
              </>
            )}
            <ThemeButton />
          </nav>
        </div>
      </footer>
      <MobileCta />
    </div>
  );
}
