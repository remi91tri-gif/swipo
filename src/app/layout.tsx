import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Charte « Maison » : Fraunces (titres, à empattements) et Inter Tight (textes).
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const DESCRIPTION =
  "Swipo, le logiciel qui soulage les gérants d'entreprise de nettoyage : planning, missions des agents sur téléphone, photos avant/après, imprévus et comptes rendus clients en PDF.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Swipo",
  title: { default: "Swipo", template: "%s · Swipo" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Swipo",
    title: "Swipo · Le logiciel des entreprises de nettoyage",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Swipo · Le logiciel des entreprises de nettoyage", description: DESCRIPTION },
  // Code de validation Google Search Console (balise HTML), réglé dans Vercel.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

// Applique le thème avant l'affichage pour éviter un flash de la mauvaise couleur.
// Choix mémorisé en priorité, sinon le réglage de l'appareil.
const themeScript = `(function(){try{var t=localStorage.getItem('swipo-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${fraunces.variable} ${interTight.variable}`}>
        {children}
        {/* Mesure de la vitesse réelle du site (Vercel Speed Insights, sans cookie). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
