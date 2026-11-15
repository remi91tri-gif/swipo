import { NextResponse, type NextRequest } from "next/server";
import { stripe, stripeEnabled } from "@/lib/billing/stripe";
import { SITE_URL, emailEnabled, emailLayout, sendEmail } from "@/lib/email";
import { removeCompanyFiles } from "@/lib/storage-cleanup";
import { adminClient, adminEnabled } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Due = {
  company_id: string;
  company_name: string;
  action: "prevenir" | "supprimer";
  ended_at: string;
  delete_on: string;
  emails: string[];
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const day = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/**
 * Tâche quotidienne (Vercel Cron) : conservation des données.
 * - 14 jours avant la suppression, le gérant est prévenu par e-mail ;
 * - 90 jours après la fin de l'accès (et au moins 13 jours après le rappel), tout est supprimé ;
 * - les sessions d'appareil orphelines sont nettoyées.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!adminEnabled || !emailEnabled) return NextResponse.json({ error: "Configuration incomplète" }, { status: 503 });

  const admin = adminClient();
  const { data, error } = await admin.rpc("retention_due");
  if (error) {
    console.error("conservation : lecture", error);
    return NextResponse.json({ error: "Lecture impossible" }, { status: 500 });
  }
  const report = { prevenues: 0, supprimees: 0, erreurs: 0, appareils: 0 };

  for (const c of (data ?? []) as Due[]) {
    try {
      if (c.action === "prevenir") {
        for (const to of c.emails) {
          await sendEmail(
            to,
            `Vos données Swipo seront supprimées le ${day(c.delete_on)}`,
            emailLayout({
              title: "Vos données vont être supprimées",
              paragraphs: [
                `L'accès de ${c.company_name} à Swipo est terminé. Comme prévu, vos données (chantiers, photos, clients, équipe) seront définitivement supprimées le ${day(c.delete_on)}.`,
                "Pour les garder, il suffit de choisir une offre avant cette date : tout sera retrouvé tel quel. Pensez aussi à télécharger les comptes rendus dont vous avez besoin.",
              ],
              button: { label: "Choisir une offre", url: `${SITE_URL}/abonnement` },
              foot: "Vous ne souhaitez plus utiliser Swipo ? Vous n'avez rien à faire : la suppression est automatique.",
            }),
          );
        }
        const { error: markErr } = await admin.rpc("retention_mark_notified", { p_company: c.company_id });
        if (markErr) throw markErr;
        report.prevenues++;
      } else {
        if (stripeEnabled && c.stripe_subscription_id) await stripe().subscriptions.cancel(c.stripe_subscription_id).catch(() => null);
        if (stripeEnabled && c.stripe_customer_id) await stripe().customers.del(c.stripe_customer_id).catch(() => null);
        await removeCompanyFiles(admin, c.company_id);
        const { error: delErr } = await admin.rpc("retention_delete", { p_company: c.company_id });
        if (delErr) throw delErr;
        report.supprimees++;
      }
    } catch (e) {
      report.erreurs++;
      console.error(`conservation : ${c.action} ${c.company_id}`, e);
    }
  }

  const { data: purged } = await admin.rpc("purge_orphan_devices");
  report.appareils = (purged as number | null) ?? 0;
  console.log("conservation des données", report);
  return NextResponse.json(report);
}
