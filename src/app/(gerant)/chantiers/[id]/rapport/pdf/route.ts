import { getSession } from "@/lib/data";
import { REPORTABLE, getClientReport } from "@/lib/data-report";
import { isDemo } from "@/lib/env";
import { renderReportPdf, type PdfImage } from "@/lib/report-pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slug(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "client";
}

/** Le PDF du compte rendu client, avec les photos choisies par le gérant. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    return await buildPdf(req, ctx);
  } catch (e) {
    console.error("rapport PDF", e);
    const err = e as Error;
    return new Response(`Le PDF n'a pas pu être créé. [${err?.name}] ${err?.message}\n${err?.stack?.split("\n").slice(0, 6).join("\n")}`, { status: 500 });
  }
}

async function buildPdf(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return new Response("Réservé au gérant.", { status: 403 });
  const report = await getClientReport(session, id);
  if (!report) return new Response("Chantier introuvable.", { status: 404 });
  if (!REPORTABLE.includes(report.status)) return new Response("Le chantier n'est pas encore terminé.", { status: 409 });

  const images = new Map<string, PdfImage>();
  if (!isDemo) {
    const supabase = await createClient();
    const load = async (bucket: string, path: string) => {
      const { data } = await supabase.storage.from(bucket).download(path);
      if (!data) return;
      const buf = Buffer.from(await data.arrayBuffer());
      const png = buf[0] === 0x89 && buf[1] === 0x50;
      images.set(`${bucket}/${path}`, { data: buf, format: png ? "png" : "jpg" });
    };
    const chosen = report.photos.filter((p) => p.included);
    await Promise.all([
      ...chosen.map((p) => load("photos", p.path)),
      report.company.logoPath ? load("logos", report.company.logoPath) : Promise.resolve(),
    ]);
    await supabase.from("reports").upsert({ company_id: session.company.id, job_id: id, generated_at: new Date().toISOString() }, { onConflict: "job_id" });
  }

  const pick = (kind: "avant" | "apres") =>
    report.photos.filter((p) => p.included && p.kind === kind).map((p) => images.get(`photos/${p.path}`)).filter((x): x is PdfImage => !!x);
  const logo = report.company.logoPath ? images.get(`logos/${report.company.logoPath}`) ?? null : null;
  const pdf = await renderReportPdf(report, logo, pick("avant"), pick("apres"));

  const name = `compte-rendu-${slug(report.clientName)}-${(report.finishedAt ?? report.date ?? "").slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
