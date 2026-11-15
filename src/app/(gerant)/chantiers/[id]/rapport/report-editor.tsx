"use client";

import { usePending } from "@/lib/use-pending";
import { useEffect, useRef, useState } from "react";
import { Check, Download, ImagePlus, Share2 } from "lucide-react";
import { Button, Card, CardTitle, FormError } from "@/components/ui";
import { isDemo } from "@/lib/env";
import { useHydrated } from "@/lib/use-hydrated";
import { browserClient } from "@/lib/supabase/client";
import type { ClientReport, ReportPhoto } from "@/lib/data-report";
import { markReportSent, saveReport, setCompanyLogo } from "./actions";

function dateLabel(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso),
  );
}

/** Logo ramené à 600 px maximum, en PNG (garde la transparence). */
async function shrinkLogo(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("conversion");
  return blob;
}

function PhotoPicker({ title, photos, included, toggle }: { title: string; photos: ReportPhoto[]; included: Set<string>; toggle: (id: string) => void }) {
  if (!photos.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-ink-muted">{title}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((p) => {
          const on = included.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`Photo ${title.toLowerCase()} ${photos.indexOf(p) + 1}`}
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-lg border-2 transition ${on ? "border-azur" : "border-transparent opacity-45"}`}
            >
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <span className="block aspect-[4/3] bg-hairline" />
              )}
              <span aria-hidden className={`absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full ${on ? "bg-azur text-on-azur" : "border-2 border-white bg-black/30"}`}>
                {on && <Check size={13} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReportEditor({ report }: { report: ClientReport }) {
  const [summary, setSummary] = useState(report.summary);
  const [reservations, setReservations] = useState(report.reservations);
  const [included, setIncluded] = useState(() => new Set(report.photos.filter((p) => p.included).map((p) => p.id)));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, start] = usePending();
  const ready = useHydrated();
  const [logoBusy, setLogoBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [sentAt, setSentAt] = useState(report.lastSentAt);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const probe = new File([new Blob(["x"])], "x.pdf", { type: "application/pdf" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  const toggle = (id: string) =>
    setIncluded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () =>
    saveReport(
      report.jobId,
      summary,
      reservations,
      report.photos.map((p) => p.id),
      [...included],
    );

  const onSave = () =>
    start(async () => {
      setError(null);
      setNotice(null);
      const res = await save();
      if (res.error) setError(res.error);
      else setNotice("Compte rendu enregistré.");
    });

  const deliver = (mode: "download" | "share") =>
    start(async () => {
      setError(null);
      setNotice(null);
      const saved = await save();
      if (saved.error) return setError(saved.error);
      const res = await fetch(`/chantiers/${report.jobId}/rapport/pdf`, { cache: "no-store" });
      if (!res.ok) return setError("Le PDF n'a pas pu être créé. Réessayez dans un instant.");
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "compte-rendu.pdf";
      if (mode === "share") {
        const file = new File([blob], name, { type: "application/pdf" });
        try {
          await navigator.share({ files: [file], title: `Compte rendu — ${report.clientName}` });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          return setError("Le partage n'a pas abouti. Téléchargez le PDF puis envoyez-le.");
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      await markReportSent(report.jobId);
      setSentAt(new Date().toISOString());
      setNotice(mode === "share" ? "Compte rendu partagé." : "PDF téléchargé. Vous pouvez l'envoyer à votre client par e-mail ou WhatsApp.");
    });

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    if (isDemo) return setError("Mode démonstration : rien n'est enregistré.");
    setLogoBusy(true);
    setError(null);
    try {
      const blob = await shrinkLogo(file);
      const path = `${report.company.id}/logo-${crypto.randomUUID()}.png`;
      const { error: upErr } = await browserClient().storage.from("logos").upload(path, blob, { contentType: "image/png" });
      if (upErr) throw upErr;
      const res = await setCompanyLogo(path);
      if (res.error) setError(res.error);
    } catch {
      setError("Ce logo n'a pas pu être ajouté. Utilisez une image PNG ou JPEG de moins de 2 Mo.");
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  };

  const before = report.photos.filter((p) => p.kind === "avant");
  const after = report.photos.filter((p) => p.kind === "apres");
  const shownBefore = before.filter((p) => included.has(p.id) && p.url);
  const shownAfter = after.filter((p) => included.has(p.id) && p.url);
  const contact = [report.company.phone, report.company.address].filter(Boolean).join(" · ");
  const when = dateLabel(report.finishedAt ?? report.date);

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Réglages */}
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-6">
        <Card className="flex flex-col gap-5 p-7">
          <CardTitle>Texte</CardTitle>
          <div>
            <label htmlFor="summary" className="mb-2 block text-sm text-ink-muted">Résumé de l&apos;intervention (facultatif)</label>
            <textarea
              id="summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Nettoyage complet de la vitrine intérieure et extérieure, encadrements et porte d'entrée."
              className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="reservations" className="mb-2 block text-sm text-ink-muted">Réserves à signaler au client (facultatif)</label>
            <textarea
              id="reservations"
              rows={3}
              value={reservations}
              onChange={(e) => setReservations(e.target.value)}
              placeholder="Traces de calcaire anciennes en bas de la vitrine : un traitement spécifique est conseillé."
              className="w-full rounded-lg border border-line-strong bg-surface-raised px-4 py-3.5 text-[15px] text-ink"
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-7">
          <CardTitle action={<span className="text-sm text-ink-muted">{included.size} sur {report.photos.length}</span>}>Photos</CardTitle>
          {report.photos.length === 0 ? (
            <p className="text-ink-muted">Aucune photo avant ou après sur ce chantier.</p>
          ) : (
            <>
              <p className="text-sm text-ink-muted">Touchez une photo pour l&apos;ajouter ou la retirer du compte rendu.</p>
              <PhotoPicker title="Avant" photos={before} included={included} toggle={toggle} />
              <PhotoPicker title="Après" photos={after} included={included} toggle={toggle} />
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-7">
          <CardTitle>Votre logo</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            {report.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={report.company.logoUrl} alt={`Logo ${report.company.name}`} className="h-12 max-w-[160px] rounded-md bg-white object-contain p-1" />
            ) : (
              <span className="text-sm text-ink-muted">Aucun logo : le nom de l&apos;entreprise s&apos;affiche seul.</span>
            )}
            <input ref={logoInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            <Button variant="secondary" type="button" disabled={logoBusy || !ready} onClick={() => logoInput.current?.click()}>
              <ImagePlus aria-hidden size={16} /> {logoBusy ? "Envoi…" : report.company.logoUrl ? "Changer" : "Ajouter un logo"}
            </Button>
          </div>
          <p className="text-sm text-ink-muted">Il apparaît sur tous vos comptes rendus.</p>
        </Card>
      </div>

      {/* Aperçu */}
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4 lg:sticky lg:top-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" disabled={busy || !ready} onClick={() => deliver("download")}>
            <Download aria-hidden size={16} /> {busy ? "Préparation…" : "Télécharger le PDF"}
          </Button>
          {canShare && (
            <Button variant="strong" type="button" disabled={busy || !ready} onClick={() => deliver("share")}>
              <Share2 aria-hidden size={16} /> Partager
            </Button>
          )}
          <Button variant="ghost" type="button" disabled={busy || !ready} onClick={onSave}>Enregistrer</Button>
          {sentAt && <span className="text-sm text-ink-muted">Dernier envoi : {dateLabel(sentAt)}</span>}
        </div>
        <FormError message={error} />
        {notice && <p role="status" className="rounded-lg bg-valide-soft px-4 py-3 font-semibold text-valide">{notice}</p>}

        <div aria-label="Aperçu du compte rendu" className="rounded-xl bg-white p-8 text-[13px] leading-[1.5] text-[#12202b] shadow-hero ring-1 ring-black/5 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              {report.company.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.company.logoUrl} alt="" className="max-h-11 max-w-[110px] object-contain" />
              )}
              <div>
                <p className="font-display text-[15px] font-semibold">{report.company.name}</p>
                {contact && <p className="text-[11px] text-[#556673]">{contact}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[#1b2430]">COMPTE RENDU D&apos;INTERVENTION</p>
              <p className="text-[11px] text-[#556673]">{when}</p>
            </div>
          </div>
          <p className="mt-7 font-display text-[22px] leading-7 font-semibold tracking-[-0.02em]">{report.title}</p>
          <span className="mt-2.5 mb-5 block h-0.5 w-10 bg-[#a8874e]" />
          <dl className="grid grid-cols-2 border-t border-[#e2e7ec]">
            {[
              ["CLIENT", report.clientName],
              ["DATE", when],
              ["ADRESSE", report.address],
              ["PRESTATION", report.services.join(", ") || report.title],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-[#e2e7ec] py-2.5 pr-3">
                <dt className="text-[10px] font-semibold tracking-[0.08em] text-[#556673]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {summary.trim() && (
            <div className="mt-5">
              <p className="mb-1.5 font-display text-[14px] font-semibold">Résumé de l&apos;intervention</p>
              <p className="whitespace-pre-line">{summary.trim()}</p>
            </div>
          )}
          {report.tasks.length > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 font-display text-[14px] font-semibold">Travaux réalisés</p>
              <ul className="flex flex-col gap-1">
                {report.tasks.map((t) => (
                  <li key={t} className="flex items-start gap-2"><span aria-hidden className="mt-[7px] size-[5px] flex-none rounded-full bg-[#1a6b43]" />{t}</li>
                ))}
              </ul>
            </div>
          )}
          {(shownBefore.length > 0 || shownAfter.length > 0) && (
            <div className="mt-5">
              <p className="mb-2 font-display text-[14px] font-semibold">Photos avant / après</p>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-[#556673]">AVANT</p>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-[#556673]">APRÈS</p>
                {Array.from({ length: Math.max(shownBefore.length, shownAfter.length) }, (_, i) =>
                  [shownBefore[i], shownAfter[i]].map((p, j) =>
                    p ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url!} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                    ) : (
                      <span key={`vide-${i}-${j}`} />
                    ),
                  ),
                )}
              </div>
            </div>
          )}
          {reservations.trim() && (
            <div className="mt-5 rounded-lg bg-[#fdf1d3] p-3.5">
              <p className="font-semibold text-[#6b4a00]">Réserves</p>
              <p className="whitespace-pre-line">{reservations.trim()}</p>
            </div>
          )}
          <p className="mt-8 border-t border-[#e2e7ec] pt-2.5 text-[10px] text-[#556673]">{report.company.name} · compte rendu établi avec Swipo</p>
        </div>
      </div>
    </div>
  );
}
