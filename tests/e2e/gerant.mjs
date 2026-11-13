import { chromium } from 'playwright';
// Parcours complet du gérant sur une instance branchée à Supabase.
// Usage : E2E_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/gerant.mjs
// Le compte doit être un gérant dont l'entreprise est vide (première connexion).
const B = process.env.E2E_URL ?? 'http://localhost:3000';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const step = async (name, fn) => { try { await fn(); console.log('ok  ' + name); } catch (e) { console.log('ÉCHEC ' + name + ' : ' + e.message.split('\n')[0]); await p.screenshot({ path: 'e2e-echec.png', fullPage: true }); throw e; } };
  await step('Connexion du gérant de test', async () => {
    await p.goto(B + '/connexion'); await p.fill('#email', process.env.E2E_EMAIL); await p.fill('#password', process.env.E2E_PASSWORD);
    await p.click('form button[type=submit]'); await p.waitForURL('**/aujourdhui', { timeout: 20000 });
  });
  await step("L'entreprise est créée à la première connexion", async () => {
    await p.getByText('Swipo Test').first().waitFor(); await p.getByRole('heading', { name: 'Bonjour Marc' }).waitFor();
  });
  await step('Ajout de Karim dans l\'équipe', async () => {
    await p.goto(B + '/equipe'); await p.fill('#first_name', 'Karim'); await p.fill('#last_name', 'B.'); await p.fill('#phone', '06 11 22 33 44');
    await p.getByRole('button', { name: 'Ajouter', exact: true }).click(); await p.getByText('Karim est ajouté').waitFor({ timeout: 15000 });
    await p.reload(); await p.getByText('Invitation à envoyer').waitFor();
  });
  await step('Création d\'un client avec son adresse', async () => {
    await p.goto(B + '/clients'); await p.fill('#name', 'Boulangerie du Port'); await p.selectOption('#type', 'professionnel');
    await p.fill('#address', '4 quai Lunel, 06300 Nice'); await p.fill('#access', 'Clé sous le comptoir');
    await p.getByRole('button', { name: 'Ajouter le client' }).click(); await p.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 15000 });
    await p.getByText('4 quai Lunel, 06300 Nice').waitFor();
  });
  await step('Création d\'un chantier pour ce client avec Karim', async () => {
    await p.getByRole('link', { name: 'Nouveau chantier' }).click(); await p.waitForURL(/chantiers\/nouveau\?client=/);
    await p.fill('#time', '09:00'); await p.getByText('Karim B.').click();
    await p.click('form button[type=submit]:has-text("Créer le chantier")'); await p.waitForURL(/\/chantiers\/[0-9a-f-]{36}\?cree=1/, { timeout: 20000 });
    await p.getByText('Chantier créé.').waitFor(); await p.getByText('Planifié').first().waitFor();
    await p.getByText('Vitres extérieures').waitFor();
  });
  await step('Création d\'un chantier avec un nouveau client, sans agent', async () => {
    await p.goto(B + '/chantiers/nouveau'); await p.selectOption('#client_id', 'new');
    await p.fill('#new_client_name', 'Mme Rossi'); await p.fill('#new_address', '18 bd de Cimiez, 06000 Nice');
    await p.getByRole('button', { name: 'Après déménagement' }).click();
    await p.click('form button[type=submit]:has-text("Créer le chantier")'); await p.waitForURL(/cree=1/, { timeout: 20000 });
    await p.getByText('À planifier').first().waitFor();
  });
  await step('Conflit détecté quand Karim est déjà pris', async () => {
    await p.goto(B + '/chantiers/nouveau'); await p.fill('#time', '09:30'); await p.getByText('Karim B.').click();
    await p.getByText(/Karim est déjà sur/).waitFor({ timeout: 10000 });
  });
  await step('Le planning du jour montre les deux chantiers', async () => {
    await p.goto(B + '/planning'); await p.getByText('À affecter · 1').waitFor(); await p.getByText('Nettoyage de vitres').first().waitFor();
  });
  await step('Le tableau de bord compte 2 chantiers prévus', async () => {
    await p.goto(B + '/aujourdhui'); const n = await p.locator('section[aria-label="Chiffres du jour"] .font-display').first().textContent();
    if (n.trim() !== '2') throw new Error('valeur ' + n);
    
  });
  await step('Liste des chantiers à venir', async () => { await p.goto(B + '/chantiers'); await p.getByText('Mme Rossi').waitFor(); });
  console.log(errs.length ? 'erreurs navigateur :\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
})().catch(() => process.exit(1));
