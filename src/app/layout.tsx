import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Figtree, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "Swipo", template: "%s · Swipo" },
  description: "Le suivi de chantiers des entreprises de nettoyage. Un geste, tout est net.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f171e" },
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
      <body className={`${sora.variable} ${figtree.variable}`}>
        {children}
        {/* Mesure de la vitesse réelle du site (Vercel Speed Insights, sans cookie). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
