/** Blocs gris affichés pendant le chargement d'une page (réponse immédiate au clic). */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-hairline ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <Bone className="h-3.5 w-40" />
        <Bone className="h-9 w-72 max-w-full" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <div className="h-[106px] rounded-xl border border-line bg-surface-raised p-6">
        <Bone className="h-full w-full" />
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-0 overflow-hidden rounded-xl border border-line bg-surface-raised">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-5 border-t border-hairline px-7 py-5 first:border-t-0">
              <Bone className="h-4 w-12" />
              <span className="flex flex-1 flex-col gap-2">
                <Bone className="h-4 w-56 max-w-full" />
                <Bone className="h-3.5 w-40 max-w-full" />
              </span>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
          <div className="h-40 rounded-xl border border-line bg-surface-raised p-6"><Bone className="h-full w-full" /></div>
        </div>
      </div>
    </div>
  );
}

export function AgentSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-5 px-5 pt-16">
      <Bone className="h-3.5 w-36" />
      <Bone className="h-9 w-56" />
      <Bone className="h-56 w-full rounded-2xl" />
      <Bone className="h-20 w-full rounded-xl" />
    </div>
  );
}
