// Connexion d'un agent par lien d'invitation : le gérant crée le lien, l'agent l'ouvre, il est connecté.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/invitation.mjs (gérant à sa première connexion).
// Nécessite « Allow anonymous sign-ins » activé dans Supabase.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
const B = process.env.E2E_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const errors = [];
let current;
async function step(name, fn) {
  try {
    await fn();
    console.log("ok  " + name);
  } catch (e) {
    console.log("ÉCHEC " + name + " : " + e.message.split("\n")[0]);
    await current?.screenshot({ path: "e2e-echec.png", fullPage: true });
    throw e;
  }
}
async function page(viewport) {
  const p = await (await b.newContext({ viewport })).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  current = p;
  return p;
}

try {
  const g = await page({ width: 1280, height: 900 });
  let link;
  await step("Gérant : ajoute Karim et crée son lien de connexion", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", process.env.E2E_EMAIL);
    await g.fill("#password", process.env.E2E_PASSWORD);
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.waitForURL("**/aujourdhui", { timeout: 20000 });
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.getByRole("button", { name: "Créer le lien de connexion" }).click();
    await g.getByRole("link", { name: "WhatsApp" }).waitFor({ timeout: 15000 });
    link = await g.locator("[data-invite-link]").inputValue();
    const wa = await g.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
    if (!wa.startsWith("https://wa.me/33611223344?text=") || !decodeURIComponent(wa).includes(link)) throw new Error("lien WhatsApp incorrect");
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : ouvre le lien, rejoint l'équipe, voit ses chantiers", async () => {
    await a.goto(link);
    await a.getByRole("heading", { name: "Bonjour Karim" }).waitFor({ timeout: 15000 });
    await a.getByRole("button", { name: "Rejoindre mon équipe" }).click();
    await a.waitForURL("**/agent", { timeout: 20000 });
    await a.getByRole("heading", { name: "Bonjour Karim" }).waitFor({ timeout: 15000 });
  });
  await step("Agent : reste connecté après fermeture et réouverture", async () => {
    await a.goto(B + "/agent");
    await a.getByRole("heading", { name: "Bonjour Karim" }).waitFor({ timeout: 15000 });
  });
  await step("Le lien ne sert qu'une fois", async () => {
    const other = await page({ width: 390, height: 844 });
    await other.goto(link);
    await other.getByText("Ce lien n'est plus valable").waitFor({ timeout: 15000 });
  });
  current = g;
  await step("Gérant : Karim apparaît « Connecté »", async () => {
    await g.reload();
    await g.getByText("Connecté", { exact: true }).waitFor({ timeout: 15000 });
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
