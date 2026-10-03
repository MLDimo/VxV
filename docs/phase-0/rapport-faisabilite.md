# Phase 0 — Rapport de faisabilité

Client testé : 1.60.1 build 70170 · Interface : 16001 (confirmée) · Sessions : 2026-10-02, solo, donjon à 5, guilde puis raid à 2 ; 2026-10-03, solo (journal complet dans `sessions/`, aucune erreur Lua de la sonde)

Légende : ✅ go · ⚠️ go avec contournement · ❌ no-go · ⏳ non testé

## 0.1 Inventaire de l'API (session 2026-10-02, solo)

| Élément | Résultat | Verdict |
| --- | --- | --- |
| Interface du client | 16001, build 1.60.1.70170 | ✅ |
| BugSack 12.1.2 + BugGrabber 11.1.4 | Erreurs capturées et enregistrées | ✅ |
| Communication : `C_ChatInfo.*` dont `InChatMessagingLockdown` | Présentes ; `SendAddonMessage` global absent | ✅ |
| Loot : `C_PartyInfo.GetLootMethod`, `GetMasterLootCandidate`, `GiveMasterLoot`, `C_LootHistory` | Présentes ; `GetLootMethod` global absent | ✅ fonctionnement détaillé en 0.4 |
| Boss : `ENCOUNTER_START/END`, `BOSS_KILL`, `ENCOUNTER_LOOT_RECEIVED`, `LOOT_HISTORY_*` | Tous acceptés à l'enregistrement, mais `BOSS_KILL` et `ENCOUNTER_LOOT_RECEIVED` ne se déclenchent jamais (voir 0.4) | ✅ |
| Noms et guilde : `UnitFullName`, `Ambiguate`, `C_GuildInfo.GuildRoster`, `GetGuildRosterInfo`, `C_Club` | Présentes | ✅ |
| `C_Item.GetItemInfo`, `C_EncounterJournal`, `issecretvalue` | Présentes | ✅ |
| `COMBAT_LOG_EVENT_UNFILTERED` | Interdit (ADDON_ACTION_FORBIDDEN) | ❌ sans impact : le plan ne s'en sert pas |

Conséquence pour la couche Compat : utiliser uniquement les espaces `C_*` modernes, jamais les anciennes globales.

## Bilan au 2026-10-02

Aucun no-go bloquant. Le plan tient, avec les ajustements listés en fin de rapport.

Reste à tester :

- 0.4 : distribution en étant soi-même maître du butin (interface classique présente, risque faible), repris par T2.
- T1 à T10 : tests complémentaires du 3 octobre, avant la fin de la bêta le 21 octobre (section dédiée plus bas).

## Résultats par fonctionnalité

| Test | Question | Résultat | Verdict | Contournement / impact sur le plan |
| --- | --- | --- | --- | --- |
| 0.3 | Messages addon sur GUILD | Distribués aux autres membres : le ping d'un 2e membre équipé de la sonde (« Ðeja Vu ») a été reçu. En revanche, l'expéditeur ne reçoit jamais ses propres messages de guilde (5 essais), contrairement au canal de groupe. | ✅ | L'addon traite localement ce qu'il envoie à la guilde, sans attendre d'écho. |
| 0.3 | Messages addon sur PARTY / RAID hors instance | RAID hors instance : envoyés, renvoyés à l'expéditeur, et reçus par un 2e membre équipé de la sonde qui a répondu (aller-retour 747 ms). Même limite de 255 octets que sur PARTY. PARTY testé en instance. | ✅ | |
| 0.3 | Messages addon en instance | PARTY dans un donjon : envoyés et reçus | ✅ | |
| 0.3 | Messages addon pendant un boss | Refusés (`AddOnMessageLockdown`) pendant les trois boss testés (Faldrim Courbenclume, Infurnus, Pillage). Le verrou est encore actif au moment d'ENCOUNTER_END et se lève juste après. Combat contre des monstres ordinaires : messages acceptés. | ❌ | Seules les rencontres de boss bloquent. File d'attente pendant une rencontre, envoi dès que `C_ChatInfo.InChatMessagingLockdown()` redevient faux. Tout calcul utile pendant un boss se fait en local (P8). |
| 0.3 | Taille maximale d'un message | 255 octets. Au-delà, l'envoi est accepté mais le message est tronqué à 255 octets sans erreur. | ⚠️ | Découpage obligatoire en morceaux de 255 octets au plus, numérotés (P4.6). |
| 0.3 | Débit avant refus (throttle) | 10 messages d'affilée par préfixe, tous canaux confondus (un ping consomme une place), puis refus `AddonMessageThrottle`. Le quota se recharge d'environ 1 message par seconde. Les messages acceptés arrivent tous, instantanément. | ⚠️ | File d'envoi limitée à 10 en rafale puis 1 par seconde, partagée par tout VXV (P4.6). |
| 0.3 | Whisper addon vers un nom « Prénom Nom » | Fonctionne avec « Ðéjà Vu » comme cible, aller-retour 800 ms environ | ✅ | |
| 0.3 | Format de l'expéditeur des messages addon | « Prénom Nom » avec une espace (« Ðéjà Vu ») | ✅ | Même format que `GetUnitName(unit, true)`. |
| 0.4 | Détection des boss (ENCOUNTER_END, BOSS_KILL) | 4 boss de La salle des Thanes (3493 à 3496) : ENCOUNTER_START et ENCOUNTER_END reçus à chaque fois, avec l'identifiant et le succès. BOSS_KILL ne s'est jamais déclenché. | ✅ | Détecter un boss tué par ENCOUNTER_END avec succès = 1. |
| 0.4 | Maître du butin disponible | Oui : `C_PartyInfo.GetLootMethod` renvoie Masterlooter. Dans le menu, il s'appelle « Responsable du butin », et le seuil minimal est « Inhabituel » (vert), sans option pour les objets gris ou blancs. Sous maître du butin, CHAT_MSG_LOOT annonce à tous « Ugly Hole reçoit le butin : [Bottines du golem protecteur] ». | ✅ | Tout membre voit chaque attribution, même sans être maître du butin. |
| 0.4 | Capture de l'attribution chez le maître du butin | L'interface classique existe : `MasterLooterFrame`, `MasterLooterFrame_GiveMasterLoot`, `GiveMasterLoot`, `GetMasterLootCandidate`, `IsMasterLooter`. En raid de 2, le joueur était bien reconnu comme maître du butin (raid1) pendant 25 min, mais aucun objet vert n'est tombé : les objets sous le seuil sont ramassés normalement, sans candidats. La sonde écoute déjà `GiveMasterLoot`. | ⏳ | Risque faible. À faire sur un boss de donjon, qui donne toujours un objet vert ou mieux. |
| 0.4 | Attribution visible chez les autres joueurs | En butin de groupe, `C_LootHistory.GetSortedInfoForDrop` donne pour chaque objet le gagnant (prénom nom, classe, GUID, jet de dés) et l'identifiant de rencontre (0 pour un monstre ordinaire). Les jets d'un butin de boss durent 3 minutes. CHAT_MSG_LOOT donne aussi « Prénom Nom reçoit le butin ». ENCOUNTER_LOOT_RECEIVED ne se déclenche jamais. | ✅ | Suivi automatique du loot possible sans maître du butin, chez n'importe quel membre. |
| 0.5 | Format des noms | `UnitName` et `UnitFullName` renvoient le **prénom** (« Ðéjà ») puis le **nom de famille** (« Vu ») à la place du royaume. `GetUnitName(unit, true)`, l'expéditeur des messages addon, la liste de guilde et la cible des chuchotements utilisent tous « Prénom Nom » avec une espace. Pas de serveur, mais un type de monde (PvE, PvP, RP, HC) : `GetRealmName()` renvoie « Classic Beta PvP ». Caractères accentués sur plusieurs octets. | ✅ | Un personnage = prénom + nom de famille, stockés séparément. Le couple est unique dans tout le jeu, tous types de monde confondus : c'est la clé naturelle du personnage. Le type de monde est un réglage de la guilde. Lecture via une seule fonction Compat. |
| 0.5 | Noms secrets hors combat / en combat | Monstre ciblé en combat : nom secret. Joueur lui-même et membres du groupe : lisibles, même pendant un boss. | ✅ | Seuls les noms des ennemis sont secrets. Ne jamais dépendre du nom d'un monstre. |
| 0.5 | Liste de guilde : nom, classe, rang | 38 membres lus : « Prénom Nom » pour tous, classe (SHAMAN, ROGUE…), indice et nom du rang, niveau, en ligne. Une 2e demande moins de 10 s après la première ne déclenche pas de mise à jour. | ✅ | Export de la liste par l'addon des officiers faisable (P4.7, P2.4). Ne pas redemander la liste plus d'une fois toutes les 10 s. |
| 0.6 | SavedVariables relues après /reload | Oui : chargements 1, 2, 3 enchaînés, journal conservé, bloc de 64 Ko relu intact | ✅ | Le bug de la bêta semble corrigé sur le build 70170. |
| 0.6 | SavedVariables relues après redémarrage | Oui : chargement n° 4 après sortie complète du jeu, bloc de 64 Ko intact | ✅ | |
| 0.6 | Fichier externe lu après /reload | Oui : 64 Ko écrits jeu ouvert, lus après /reload | ✅ | Valide la descente des données par le compagnon (bundle `VXV_Sync`). |
| 0.6 | Taille maximale du fichier externe | 2 Mo lus sans erreur, après /reload et après redémarrage | ✅ | Largement suffisant pour les données de la guilde. |
| 0.6 | Contournement seed | Inutile : les SavedVariables sont relues normalement | ✅ | Abandonné. |

## Compléments du 3 octobre (T1 à T10)

| Test | Question | Résultat | Verdict | Impact sur le plan |
| --- | --- | --- | --- | --- |
| T1 | L'addon invite-t-il un « Prénom Nom » et passe-t-il le groupe en raid, avec et sans clic ? | Avec clic : oui. `C_PartyInfo.InviteUnit("Prénom Nom")` invite, même écrit en minuscules (« tito muldoon » devient « Tito Muldoon »). Le groupe est créé dès l'invitation, avant la réponse. Le refus est annoncé dans le canal système (« X refuse votre invitation »). `ConvertToRaid()` donne « Groupe converti en raid ». Sans clic : pas encore testé. | ✅ | Invitations automatiques des inscrits (P5) |
| T2 | Le maître du butin peut-il donner un objet depuis l'addon, avec et sans clic ? | | ⏳ | Attribution depuis la liste des SR (P6) |
| T3 | Les `/roll` de tous les joueurs sont-ils lisibles (nom, jet, bornes) ? | Les siens : oui. Message système « Ðéjà Vu obtient un 98 (1-100). », découpé grâce au format du jeu `RANDOM_ROLL_RESULT` (« %s obtient un %d (%d-%d). »), nom au format « Prénom Nom ». Rolls des autres joueurs : à vérifier en groupe (même message). | ✅ | Rolls SR et SR+ (P6), deathroll (P15) |
| T4 | L'addon lit-il et écrit-il dans le canal raid, y compris pendant un boss ? | Avec clic, hors boss : oui. Le message envoyé sur RAID par le chef revient en CHAT_MSG_RAID_LEADER. Les messages des autres joueurs sont lisibles (CHAT_MSG_PARTY de Tito Muldoon). Sans clic, avertissement de raid et pendant un boss : pas encore testés. | ✅ | Annonces automatiques en raid |
| T5 | Un bouton de l'addon peut-il lancer un `/roll`, et sans clic ? | Oui dans les deux cas : `RandomRoll(1, 100)` depuis un bouton, puis 3 s après une commande, hors de tout clic. Aucune action bloquée. | ✅ | Bouton de roll (P6, P15) |
| T6 | Les morts et résurrections du groupe sont-elles visibles sans journal de combat ? | | ⏳ | Titres liés aux morts (P13) |
| T7 | Le compteur de dégâts et de soins du jeu est-il lisible par l'addon ? | Oui, après le combat. `C_DamageMeter` offre 8 fonctions : sessions par type ou par identifiant, détail par combattant, durée, remise à zéro. Il compte 11 types, dont dégâts, soins, absorptions, interruptions, dissipations et morts. Une session est gardée par combat (nom du monstre, durée), plus le cumul. Pendant le combat, montants, noms et GUID sont secrets ; seuls la classe et « c'est moi » restent lisibles. Après le combat, tout est lisible : « Ðéjà Vu », 327 dégâts en 21 s, 15,6 par seconde, GUID `Player-…`. Les autres membres du groupe sont à confirmer en groupe. | ✅ | Titres de dégâts et de soins faisables (P13), à condition de lire le compteur après chaque combat (après ENCOUNTER_END), jamais pendant. Le type « morts » peut compléter T6. |
| T8 | Quelles statistiques du jeu sont lisibles ? | Toutes celles de l'onglet Statistiques, hors combat. Un monstre tué fait évoluer 5 compteurs : Créatures tuées (923 → 924), Nombre total de victimes, Coups fatals en extérieur, Nombre total de coups fatals, Type de créature le plus tué (« 318 (Bêtes) » → « 319 (Bêtes) »). | ✅ | Missions et titres fondés sur les compteurs du jeu (P12, P13). La mission « monstres gris » est abandonnée. |
| T9 | Peut-on afficher un titre dans l'infobulle, le canal de guilde et la liste de guilde ? | Infobulle : ligne ajoutée par `TooltipDataProcessor.AddTooltipPostCall`. Canal de guilde : message préfixé par le titre, grâce au filtre des messages. Liste de guilde : fenêtre moderne `CommunitiesFrame`, chargée dès la connexion. L'accroche par le mixin n'a rien donné. L'accroche sur les lignes de la liste (`ScrollUtil.AddInitializedFrameCallback`) se déclenche bien, mais elle reçoit le propriétaire avant la ligne : corrigé en sonde 0.2.2. | ⏳ | Affichage des titres (P13) |
| T10 | Les métiers et recettes connues du joueur sont-ils lisibles ? | Oui. `GetProfessions` et `GetProfessionInfo` : 4 métiers avec niveau (Herboristerie 95/150, Dépeçage 104/150, Secourisme 22/75, Cuisine 6/75). À l'ouverture de chaque fenêtre de métier, `C_TradeSkillUI` donne les recettes connues avec identifiant et nom (3275 Bandage en lin, 2538 Viande de loup grillée…). Les métiers de récolte ont aussi des recettes (Herboristerie : Bougie d'encens). | ✅ | Annuaire des artisans (P14) |

## Hypothèses de départ (sources communautaires)

| Hypothèse | Résultat |
| --- | --- |
| Interface 16001, client Mainline 12.x avec valeurs secrètes | ✅ Confirmée |
| SavedVariables écrites à la sortie mais non relues | ❌ Infirmée sur le build 70170 : relues normalement |
| `COMBAT_LOG_EVENT_UNFILTERED` refusé | ✅ Confirmée (interdit, sans erreur Lua) |
| `GetItemInfo` absent, remplacé par `C_Item.GetItemInfo` | ✅ `C_Item.GetItemInfo` présent ; l'ancienne globale n'a pas été testée |

## Stratégie de synchro

Confirmée.

- **Descente** (serveur vers jeu) : le compagnon écrit un fichier Lua dans le bundle `VXV_Sync`, lu au prochain `/reload` ou lancement. ✅ Confirmé jusqu'à 2 Mo.
- **Remontée** (jeu vers serveur) : le compagnon lit les SavedVariables, écrites à chaque `/reload` et à la déconnexion, et relues par le jeu au lancement suivant. ✅ Confirmé.
- **Entre joueurs connectés** : messages addon sur GUILD, RAID et PARTY. ✅ Confirmé, avec les limites de la section 0.3.

## Ajustements du plan

- **Identité d'un personnage** (P1 schéma, P2 liaison, P3 bot) : deux champs, prénom et nom de famille, au lieu d'un nom unique. Il n'y a pas de serveur, seulement un type de monde (PvE, PvP, RP, HC) commun à toute la guilde. Le couple prénom + nom est unique dans tout le jeu : contrainte d'unicité en base sur ce couple. Le format Discord prévu « Pseudo - [Prénom Nom] » convient.
- **Couche Compat** (P4) : une fonction unique lit le prénom et le nom d'une unité. Le reste de l'addon ignore où le client range le nom de famille.
- **Communication** (P4.6) : découpage en morceaux de 255 octets, file d'envoi limitée à 10 messages en rafale puis 1 par seconde, envois suspendus pendant les rencontres de boss. Pas d'écho sur GUILD : l'expéditeur applique localement ce qu'il diffuse.
- **Suivi du loot** (P6) : deux sources. L'historique de butin du jeu, déjà validé, donne le gagnant de chaque objet en butin de groupe. La capture chez le maître du butin reste à valider.
