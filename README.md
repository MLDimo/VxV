# VXV

Outil de guilde WoW Forever : addon, site, bot Discord et app compagnon.
Conventions et état d'avancement : voir [CLAUDE.md](CLAUDE.md).

## Démarrer

```sh
nvm use          # Node 22 ou plus
npm install      # installe tous les espaces de travail
npm run check    # formatage, lint, typage, tests ; aussi lancé avant chaque push
```

## Structure

Dépôt unique géré par les espaces de travail npm. Un dossier n'est créé qu'à la phase qui le remplit.

| Dossier | Contenu | Phase |
| --- | --- | --- |
| `apps/web` | Site et API (Vercel) | P2 |
| `apps/bot` | Bot Discord en interactions HTTP (Vercel) | P3 |
| `apps/companion` | Application de bureau compagnon | P7 |
| `packages/*` | Code TypeScript partagé (domaine, formules, schémas) | dès le premier besoin |
| `addon/` | Bundles Lua de l'addon (`VXV_Core`, `VXV_Raid`, `VXV_Data_<Raid>`…) | P1.5 puis P4 |
| `data/raids` | Source des données de raid en JSON | P1.4 |
| `supabase/` | Schéma, migrations et tests de la base (`@vxv/database`) | P1.3 |
| `tools/VXV_Probe` | Addon de test de la Phase 0, jamais distribué | P0 |
| `tools/probe-harness` | Fait tourner la sonde hors du jeu (`npm test`) et exporte son journal (`npm run export:probe -- <fichier>`) | P0 |
| `tools/install-probe.sh` | Copie la sonde dans le dossier AddOns d'un client | P0 |
| `tools/write-inbox.sh` | Simule le compagnon pour le test fichiers | P0 |
| `docs/` | Rapports et protocoles par phase | toutes |
