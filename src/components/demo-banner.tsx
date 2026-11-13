import { isDemo } from "@/lib/env";

/** Rappelle qu'aucune donnée n'est enregistrée tant que Supabase n'est pas branché. */
export function DemoBanner() {
  if (!isDemo) return null;
  return (
    <p className="bg-soleil-soft px-4 py-2 text-center text-[13px] font-semibold text-soleil-ink">
      Mode démonstration : données d&apos;exemple, rien n&apos;est enregistré.
    </p>
  );
}
