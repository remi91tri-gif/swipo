import { DemoBanner } from "@/components/demo-banner";
import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link href="/" aria-label="Swipo, retour à la page d'accueil" className="mb-8 rounded-md transition-opacity hover:opacity-75">
          <Logo height={32} />
        </Link>
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
