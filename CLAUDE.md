# VXV

Outil de guilde pour WoW Forever : addon en jeu, site web, bot Discord et app compagnon, autour d'une base Supabase.
Gestion des raids, soft reserves (SR), suivi du loot, puis paris. Le plan de référence est le PDF
« VXV - Plan de développement » v1.0 : 12 phases (P0 à P11), avancées étape par étape.

## État d'avancement

- **P0 Validation technique** : tout est validé sauf la distribution d'un objet par le maître du butin, à faire dès qu'un objet vert tombe. Sonde `tools/VXV_Probe`, protocole et rapport dans `docs/phase-0/`.
  Toute modification de la sonde passe `npm test` dans `tools/probe-harness` avant `tools/install-probe.sh`.
- P1 à P11 : pas commencées. Ne pas créer leurs dossiers avant leur phase (YAGNI).

## Principes non négociables

- **DRY, SOLID, KISS, YAGNI** sur tout le code, sans exception.
- **Clean architecture** : le domaine ne dépend de rien ; l'infrastructure (Blizzard, Supabase, Discord) est derrière des adaptateurs.
- **Bundles indépendants** : chaque fonctionnalité est un bundle (`VXV_Core`, `VXV_Raid`, `VXV_Data_<Raid>`, `VXV_Sync`, `VXV_Paris`) qui ne dépend que du socle.
- La base de données fait foi. Discord, le site, le compagnon et l'addon ne sont que des points d'accès.
- Droits contrôlés par le serveur, jamais par l'addon ni le compagnon.
- Toute action d'officier passe par un journal non effaçable avec motif obligatoire.
- Nouveau raid = nouvelles données (JSON), jamais de modification de code.
- Membres : zéro effort. Installer l'addon suffit.

## Conventions Lua (addons)

- Lua 5.1, `## Interface: 16001` (WoW Forever, API Mainline 12.x avec restrictions Midnight).
- Code, noms et commentaires en anglais. Textes affichés aux joueurs en français.
- Espace de noms privé `local ADDON_NAME, ns = ...`. Aucune globale hors SavedVariables, slash commands et fichiers `External/`.
- Un fichier = une responsabilité. Module exposé via `ns.<Module>` ; dépendances lues en tête de fichier (`local Util = ns.Util`).
- Nommage : `PascalCase` pour modules et fonctions publiques, `camelCase` pour locales, `UPPER_SNAKE_CASE` pour constantes. Pas de nombre magique.
- Indentation 4 espaces, 120 caractères max, lint via `.luacheckrc`.
- Tout appel à une API Blizzard dont le nom varie passe par `Compat` (contrat `ok, ...` façon `pcall`).
- Toute valeur venant du client peut être « secrète » : passer par `Util.Safe` / `Util.IsSecret` avant de comparer, concaténer ou stocker.
- SavedVariables lues uniquement dans `ADDON_LOADED` de l'addon, jamais au chargement du fichier.
- `ReloadUI()` est protégée sur Forever : demander au joueur de taper `/reload`.
- Ordre de chargement dans le `.toc` : `Core` (outillage générique) puis modules métier puis `Bootstrap.lua` en dernier.

## Conventions TypeScript (site, bot, compagnon)

À poser en P1 : TypeScript strict, formatage automatique, tests, intégration continue GitHub.

## Contraintes WoW Forever (mesurées en P0, build 70170)

- Client moderne : utiliser uniquement les API `C_*`. Les anciennes globales sont absentes (`SendAddonMessage`, `GetLootMethod` vérifiées).
- SavedVariables : relues correctement après `/reload` et après redémarrage sur le build 70170 (ancien bug de la bêta corrigé).
- Un fichier Lua réécrit par un programme externe est relu au `/reload` ou au lancement suivant (confirmé jusqu'à 2 Mo).
- Pas de royaume côté joueur. Un personnage = prénom + nom de famille, couple unique dans tout le jeu (clé naturelle) : `UnitName` renvoie le prénom puis le nom de famille à la place du royaume, `GetUnitName(unit, true)` renvoie « Prénom Nom ». Pas de serveur mais un type de monde (PvE, PvP, RP, HC), que `GetRealmName()` reflète (ex. « Classic Beta PvP ») : il est commun à toute la guilde, donc hors de l'identité d'un personnage.
- Noms secrets : seulement ceux des ennemis en combat. Joueurs et membres du groupe restent lisibles, même pendant un boss.
- Messages addon : 255 octets maximum (au-delà, tronqués sans erreur), 10 envois d'affilée par préfixe puis 1 par seconde, et bloqués pendant une rencontre de boss uniquement (`AddOnMessageLockdown`, verrou levé juste après ENCOUNTER_END). Expéditeur au format « Prénom Nom ». Sur GUILD, l'expéditeur ne reçoit pas ses propres messages (contrairement à PARTY).
- Boss tué = `ENCOUNTER_END` avec succès ; `BOSS_KILL` et `ENCOUNTER_LOOT_RECEIVED` ne se déclenchent pas.
- Gagnant d'un objet en butin de groupe : `C_LootHistory.GetSortedInfoForDrop` (nom, classe, GUID, jet).
- Maître du butin : interface classique présente (`MasterLooterFrame`, `GiveMasterLoot`). Liste de guilde : `GetGuildRosterInfo`, pas plus d'une demande toutes les 10 s.
- `COMBAT_LOG_EVENT_UNFILTERED` interdit : le client émet ADDON_ACTION_FORBIDDEN, sans erreur Lua.
