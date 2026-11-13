import { DemoBanner } from "@/components/demo-banner";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <Logo height={32} />
        </div>
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
