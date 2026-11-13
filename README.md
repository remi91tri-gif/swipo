# Swipo

Le suivi de chantiers des petites entreprises de nettoyage. *Un geste, tout est net.*

- **Espace gérant** (ordinateur) : `/aujourdhui`, `/equipe`
- **Espace agent** (téléphone) : `/agent`, connexion par code SMS sur `/agent/connexion`

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Sans configuration Supabase, l'application tourne en **mode démonstration** :
données d'exemple, rien n'est enregistré.

## Brancher Supabase

1. Créer un projet sur supabase.com (région Europe).
2. Appliquer les migrations du dossier `supabase/migrations`, dans l'ordre.
3. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique (anon) du projet.
4. Pour la connexion des agents par SMS : activer le fournisseur « Phone » dans Supabase › Authentication.

## Tests de la base de données

```bash
./tests/db/run.sh
```

Lance un PostgreSQL jetable qui imite Supabase, applique les migrations et vérifie la sécurité
(une entreprise ne voit jamais les données d'une autre) et le cycle d'un chantier.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app/(auth)` | Connexion, inscription, connexion agent par SMS |
| `src/app/(gerant)` | Espace gérant avec la barre latérale |
| `src/app/(agent)` | Espace agent |
| `src/components` | Éléments d'interface de la charte (boutons, cartes, pastilles, thème) |
| `src/lib` | Données, mode démonstration, formats |
| `supabase/migrations` | Schéma, sécurité, règles métier |
| `tests/db` | Tests de la base |

## Test du parcours gérant

```bash
E2E_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/gerant.mjs
```

Connexion, création de l'entreprise, équipe, client, chantiers, conflit d'agenda, planning et tableau de bord, sur une vraie base Supabase.
