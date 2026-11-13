import { Card, LinkButton, PageHeader } from "./ui";

/** Écran prévu dans un lot suivant du plan de réalisation. */
export function ComingSoon({ title, lot, children }: { title: string; lot: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow={lot.toUpperCase()} title={title} />
      <Card className="flex flex-col items-start gap-4 p-8">
        <p className="max-w-[60ch] text-base text-ink-muted">{children}</p>
        <LinkButton href="/aujourdhui" variant="secondary">
          Retour à Aujourd&apos;hui
        </LinkButton>
      </Card>
    </>
  );
}
