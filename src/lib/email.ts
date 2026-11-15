import "server-only";
import nodemailer from "nodemailer";

/** Envoi d'e-mails depuis l'adresse Gmail de Swipo (mot de passe d'application dans SMTP_PASSWORD). */
export const SENDER = process.env.SMTP_USER ?? "contact.swipo@gmail.com";
export const emailEnabled = !!process.env.SMTP_PASSWORD;
export const SITE_URL = (process.env.SITE_URL ?? "https://swipo.vercel.app").replace(/\/$/, "");

let transport: nodemailer.Transporter | null = null;
function mailer() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SENDER, pass: (process.env.SMTP_PASSWORD ?? "").replace(/\s/g, "") },
  });
  return transport;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!emailEnabled) throw new Error("SMTP_PASSWORD manquant");
  await mailer().sendMail({ from: { name: "Swipo", address: SENDER }, to, subject, html });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Mise en page commune des e-mails Swipo. Les textes passés sont échappés. */
export function emailLayout(o: { title: string; paragraphs: string[]; button?: { label: string; url: string }; foot?: string }) {
  const p = o.paragraphs.map((t) => `<p style="margin:12px 0 0;font-size:16px;line-height:24px;color:#6e6759">${esc(t)}</p>`).join("");
  const btn = o.button
    ? `<p style="margin:28px 0 0"><a href="${esc(o.button.url)}" style="display:inline-block;background:#1b2430;color:#f5f2ec;text-decoration:none;font-weight:600;font-size:16px;padding:14px 26px;border-radius:8px">${esc(o.button.label)}</a></p>`
    : "";
  const foot = o.foot ? `<p style="margin:28px 0 0;font-size:14px;line-height:21px;color:#8c857a">${esc(o.foot)}</p>` : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f2ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2430">
<div style="max-width:520px;margin:0 auto;padding:32px 16px"><div style="background:#fbf9f5;border:1px solid #e3ddd2;border-radius:10px;padding:36px 32px">
<img src="${SITE_URL}/brand/swipo-logo-email.png" width="144" height="48" alt="Swipo" style="display:block;border:0">
<h1 style="margin:28px 0 0;font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:34px">${esc(o.title)}</h1>${p}${btn}${foot}
</div><p style="font-size:12px;color:#8c857a;text-align:center;margin-top:20px">Swipo · Le suivi de chantier des pros du nettoyage</p></div></body></html>`;
}
