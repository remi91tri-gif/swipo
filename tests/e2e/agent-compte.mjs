// Accès agent par e-mail et mot de passe, créé avec le lien d'invitation, et cloisonnement.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… E2E_AGENT_EMAIL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… node tests/e2e/agent-compte.mjs
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
const B = process.env.E2E_URL ?? "http://localhost:3000";
const AGENT = process.env.E2E_AGENT_EMAIL;
const AGENT_PW = "Agent-Swipo-2026!";
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
async function login(p, path, email, password) {
  await p.goto(B + path);
  await p.fill("#email", email);
  await p.fill("#password", password);
  await p.getByRole("button", { name: "Se connecter" }).click();
}
const GERANT_PAGES = ["/aujourdhui", "/chantiers", "/clients", "/equipe", "/planning", "/parametres", "/abonnement", "/connexion"];

try {
  const g = await page({ width: 1280, height: 900 });
  let link;
  await step("Gérant : ajoute Karim et crée son lien", async () => {
    await login(g, "/connexion", process.env.E2E_EMAIL, process.env.E2E_PASSWORD);
    await g.waitForURL("**/aujourdhui", { timeout: 30000 });
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.reload();
    const row = g.locator("li", { hasText: "Karim" });
    await row.getByRole("button", { name: "Créer le lien de connexion" }).click();
    await row.locator("[data-invite-link]").waitFor({ state: "attached", timeout: 15000 });
    link = await row.locator("[data-invite-link]").inputValue();
  });

  const a = await page({ width: 390, height: 844 });
  await step("Karim crée son accès avec son e-mail et un mot de passe", async () => {
    await a.goto(link);
    await a.fill("#join-email", AGENT);
    await a.fill("#join-password", AGENT_PW);
    await a.fill("#join-confirm", AGENT_PW);
    await a.getByRole("button", { name: "Créer mon accès et rejoindre" }).click();
    await a.waitForURL("**/agent", { timeout: 30000 });
  });
  await step("Karim reste bloqué dans l'espace agent", async () => {
    for (const path of GERANT_PAGES) {
      await a.goto(B + path);
      if (new URL(a.url()).pathname !== "/agent") throw new Error(`${path} a mené à ${new URL(a.url()).pathname}`);
    }
  });
  await step("La base refuse à Karim toute action de gérant", async () => {
    const cookies = await a.context().cookies();
    const parts = cookies.filter((c) => /-auth-token(\.\d+)?$/.test(c.name)).sort((x, y) => x.name.localeCompare(y.name)).map((c) => c.value).join("");
    const session = JSON.parse(Buffer.from(parts.replace(/^base64-/, ""), "base64url").toString());
    const h = { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${session.access_token}`, "content-type": "application/json", prefer: "return=representation" };
    const api = (path, init) => fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: h });
    const company = (await (await api("companies?select=id,name")).json())[0];
    const renamed = await (await api(`companies?id=eq.${company.id}`, { method: "PATCH", body: JSON.stringify({ name: "Piraté" }) })).json();
    if (Array.isArray(renamed) && renamed.length) throw new Error("un agent a renommé l'entreprise");
    const members = await (await api("members?select=id,first_name,role")).json();
    const me = members.find((m) => m.first_name === "Karim");
    const up = await (await api(`members?id=eq.${me.id}`, { method: "PATCH", body: JSON.stringify({ role: "gerant" }) })).json();
    if (Array.isArray(up) && up.length) throw new Error("un agent s'est promu gérant");
    const r = await api("rpc/claim_invite_for", { method: "POST", body: JSON.stringify({ p_token: "x", p_user: me.id }) });
    if (r.ok) throw new Error("claim_invite_for appelable depuis le navigateur");
  });
  const a2 = await page({ width: 390, height: 844 });
  await step("Sur un autre téléphone, Karim se reconnecte avec son e-mail (connexion agent)", async () => {
    await login(a2, "/agent/connexion", AGENT, AGENT_PW);
    await a2.waitForURL("**/agent", { timeout: 30000 });
  });
  const a3 = await page({ width: 390, height: 844 });
  await step("Depuis la connexion gérant aussi, il arrive dans l'espace agent", async () => {
    await login(a3, "/connexion", AGENT, AGENT_PW);
    await a3.waitForURL("**/agent", { timeout: 30000 });
  });
  current = g;
  await step("Le gérant coupe l'accès de Karim", async () => {
    await g.goto(B + "/equipe");
    const row = g.locator("li", { hasText: "Karim" });
    await row.getByRole("button", { name: "Couper son accès" }).click();
    await row.getByRole("button", { name: "Couper l'accès", exact: true }).click();
    await row.getByText(/Accès coupé|Invitation à envoyer/).first().waitFor({ timeout: 15000 });
  });
  const a4 = await page({ width: 390, height: 844 });
  await step("Karim ne peut plus se connecter", async () => {
    await login(a4, "/agent/connexion", AGENT, AGENT_PW);
    await a4.getByText("E-mail ou mot de passe incorrect.").waitFor({ timeout: 15000 });
  });
  if (errors.length) throw new Error("Erreurs de page : " + errors.join(" | "));
  console.log("Accès agent par e-mail : tout est passé.");
} finally {
  await b.close();
}
