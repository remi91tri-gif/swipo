// Sécurité : un agent ou un chef d'équipe connecté par lien n'atteint jamais l'espace gérant,
// ni par les pages ni directement par la base ; le gérant peut déconnecter un téléphone à distance.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/securite.mjs (gérant à sa première connexion)
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
const GERANT_PAGES = ["/aujourdhui", "/chantiers", "/clients", "/equipe", "/planning", "/parametres", "/abonnement", "/chantiers/nouveau", "/connexion", "/inscription"];

try {
  const g = await page({ width: 1280, height: 900 });
  const links = {};
  await step("Gérant : ajoute un agent, un chef et un 2e gérant", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", process.env.E2E_EMAIL);
    await g.fill("#password", process.env.E2E_PASSWORD);
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.waitForURL("**/aujourdhui", { timeout: 20000 });
    await g.goto(B + "/equipe");
    for (const [name, phone, role] of [["Karim", "06 11 22 33 44", null], ["Léa", "06 22 33 44 55", "Chef d'équipe"], ["Julie", "06 33 44 55 66", "Gérant"]]) {
      await g.fill("#first_name", name);
      await g.fill("#phone", phone);
      if (role) await g.locator("label", { hasText: role }).last().click();
      await g.getByRole("button", { name: "Ajouter", exact: true }).click();
      await g.getByText(`${name} est ajouté`).waitFor({ timeout: 15000 });
    }
    await g.reload();
    for (const name of ["Karim", "Léa"]) {
      const row = g.locator("li", { hasText: name });
      await row.getByRole("button", { name: "Créer le lien de connexion" }).click();
      await row.locator("[data-invite-link]").waitFor({ state: "attached", timeout: 15000 });
      links[name] = await row.locator("[data-invite-link]").inputValue();
    }
    const julie = g.locator("li", { hasText: "Julie" });
    if (await julie.getByRole("button", { name: "Créer le lien de connexion" }).count()) throw new Error("un gérant peut être invité par lien");
    await julie.getByRole("button", { name: "Inviter par e-mail" }).waitFor();
  });

  for (const name of ["Karim", "Léa"]) {
    const a = await page({ width: 390, height: 844 });
    await step(`${name} : rejoint et reste bloqué dans l'espace agent`, async () => {
      await a.goto(links[name]);
      await a.getByRole("button", { name: "Rejoindre mon équipe" }).click();
      await a.waitForURL("**/agent", { timeout: 20000 });
      for (const path of GERANT_PAGES) {
        await a.goto(B + path);
        const url = new URL(a.url());
        if (url.pathname !== "/agent") throw new Error(`${path} a mené à ${url.pathname}`);
      }
    });
    await step(`${name} : la base refuse toute action de gérant`, async () => {
      const cookies = await a.context().cookies();
      const parts = cookies.filter((c) => /-auth-token(\.\d+)?$/.test(c.name)).sort((x, y) => x.name.localeCompare(y.name)).map((c) => c.value).join("");
      const session = JSON.parse(Buffer.from(parts.replace(/^base64-/, ""), "base64url").toString());
      const h = { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${session.access_token}`, "content-type": "application/json", prefer: "return=representation" };
      const api = (path, init) => fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: h });
      const companies = await (await api("companies?select=id,name")).json();
      const company = companies[0];
      const renamed = await (await api(`companies?id=eq.${company.id}`, { method: "PATCH", body: JSON.stringify({ name: "Piraté" }) })).json();
      if (Array.isArray(renamed) && renamed.length) throw new Error("un agent a renommé l'entreprise");
      const members = await (await api("members?select=id,first_name,role")).json();
      const boss = members.find((m) => m.role === "gerant");
      for (const [fn, body] of [["create_invite_link", { p_member: boss.id }], ["disconnect_member", { p_member: boss.id }], ["delete_my_company", { p_confirm: company.name }], ["cancel_job", { p_job: boss.id }]]) {
        const r = await api(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
        if (r.ok) throw new Error(`${fn} accepté pour un agent`);
      }
      const hashes = await api("members?select=invite_hash");
      if (hashes.ok) throw new Error("les empreintes des liens sont lisibles");
      const roleUp = await (await api(`members?id=eq.${members.find((m) => m.first_name === name).id}`, { method: "PATCH", body: JSON.stringify({ role: "gerant" }) })).json();
      if (Array.isArray(roleUp) && roleUp.length) throw new Error("un agent s'est promu gérant");
    });
    if (name === "Karim") {
      current = g;
      await step("Gérant : déconnecte le téléphone de Karim à distance", async () => {
        await g.goto(B + "/equipe");
        const row = g.locator("li", { hasText: "Karim" });
        await row.getByRole("button", { name: "Couper son accès" }).click();
        await row.getByRole("button", { name: "Couper l'accès", exact: true }).click();
        await row.getByText(/Accès coupé|Invitation à envoyer/).first().waitFor({ timeout: 15000 });
      });
      current = a;
      await step("Karim n'a plus accès sur ce téléphone", async () => {
        await a.goto(B + "/agent");
        await a.waitForURL("**/agent/connexion", { timeout: 20000 });
      });
    }
  }
  if (errors.length) throw new Error("Erreurs de page : " + errors.join(" | "));
  console.log("Sécurité : tout est passé.");
} finally {
  await b.close();
}
