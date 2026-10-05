# VXV

Outil de guilde WoW Forever : addon, site, bot Discord et app compagnon.
Conventions et état d'avancement : voir [CLAUDE.md](CLAUDE.md).

## Démarrer

```sh
nvm use          # Node 22 ou plus
npm i -g npm@11  # npm 11 ou plus (npm 10 plante sur la résolution des dépendances de Vitest 4)
npm install      # installe tous les espaces de travail
npx playwright install chromium   # navigateur des tests de bout en bout, une fois
npm run check    # formatage, lint, typage, tests unitaires et de bout en bout ; aussi lancé avant chaque push
npm run generate # packs de l'addon et SQL des raids, depuis data/raids
npm run dev -w @vxv/web   # site en local sur http://localhost:3000
VXV_SITE_URL=http://localhost:3000 npm start -w @vxv/companion   # compagnon relié au site local
```

## Structure

Dépôt unique géré par les espaces de travail npm. Un dossier n'est créé qu'à la phase qui le remplit.

| Dossier | Contenu | Phase |
| --- | --- | --- |
| `apps/web` | Site et API, Next.js 16 sur Vercel ([vxv-web.vercel.app](https://vxv-web.vercel.app)), et adresse des interactions du bot (`/api/discord/interactions`) | P2, P3 |
| `packages/server` | Cœur du serveur partagé par le site et le bot : domaine, cas d'usage, PostgreSQL (`@vxv/server`) | P2 |
| `packages/bot` | Bot Discord en interactions HTTP : signature, commandes, boutons (`@vxv/bot`), hébergé par `apps/web` | P3 |
| `apps/companion` | Compagnon de bureau (Electron, Windows et Mac) : relie le jeu au site (`@vxv/companion`) | P7 |
| `addon/` | Bundles Lua de l'addon (`VXV_Core`, `VXV_Raid`, `VXV_Data_<Raid>`…) | P1.5 puis P4 |
| `packages/raid-data` | Schéma et validation des données de raid (`@vxv/raid-data`) | P1.4 |
| `packages/design` | Jetons de la charte « La Taverne » (couleurs, polices) et thème du site généré (`@vxv/design`) | Habillage |
| `data/raids` | Source des données de raid en JSON, une par raid ([format](data/raids/README.md)) | P1.4 |
| `tools/data-generator` | Génère les packs de l'addon et le script SQL des raids dans `dist/generated` (`npm run generate`) | P1.5 |
| `tools/addon-release` | Rassemble les dossiers de l'addon et inscrit la version (`npm run release:prepare -- v1.2.0`) | P1.6 |
| `supabase/` | Schéma, migrations et tests de la base (`@vxv/database`) | P1.3 |
| `tools/VXV_Probe` | Addon de test de la Phase 0, jamais distribué | P0 |
| `tools/addon-harness` | Banc d'essai des addons hors du jeu, sur un client simulé (`npm test`), et export du journal de la sonde (`npm run export:probe -- <fichier>`) | P0, P4 |
| `tools/install-probe.sh` | Copie la sonde dans le dossier AddOns d'un client | P0 |
| `tools/install-addon.sh` | Construit l'addon comme une publication (version de développement) et l'installe dans un client | P4 |
| `tools/write-inbox.sh` | Simule le compagnon pour le test fichiers | P0 |
| `tools/deploy-database.sh` | Déploie la base : migrations puis données de raid ([environnements](docs/environnements.md)) | P1.7 |
| `docs/` | Rapports, protocoles et notices ; `docs/design` : référence de la charte graphique | toutes |

## Publier l'addon

Une étiquette `v<version>` sur `main` lance la publication, après les tests :

```sh
git tag v0.1.0 && git push origin v0.1.0
```

La CI génère les packs, crée l'archive `VXV-<version>.zip`, puis la publie sur GitHub. Une version avec un tiret, comme `v0.2.0-beta.1`, est publiée en bêta.
Un lancement manuel du flux « Release addon » construit l'archive sans rien publier.

L'envoi sur CurseForge et Wago s'active dès que les projets existent, sans modifier le code. Il faut renseigner, dans les réglages GitHub du dépôt (Secrets and variables, Actions) :

| Plateforme | Secret | Variables |
| --- | --- | --- |
| CurseForge | `CF_API_KEY` | `CF_PROJECT_ID`, `CF_GAME_VERSION_IDS` |
| Wago | `WAGO_API_TOKEN` | `WAGO_PROJECT_ID`, `WAGO_PATCH_FIELD`, `WAGO_PATCH` |
