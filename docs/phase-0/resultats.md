# Résultats de la sonde (phase 0)

Ce que la sonde `tools/VXV_Probe` a mesuré sur le client de WoW Forever. Interface 16001 (confirmée). Journaux complets
dans `sessions/`, aucune erreur Lua de la sonde :

- 2 octobre, build 70170 : solo, donjon à 5, guilde puis raid à 2 ;
- 3 octobre, build 70170 : tests complémentaires T1 à T10 ;
- 5 octobre : habillage (sonde 0.3.0, `/vxvtest design show`) ;
- 6 octobre, build 70235 : inventaire de l'API refait, compteurs du jeu ;
- 7 octobre, build 70245 : T11, les journaux du jeu ; le soir, un raid à 5 dans La salle des Thanes (rencontres de
  boss dans le journal de combat, compteur de dégâts lu par identifiant).

Les mesures qui manquent encore sont dans `docs/tests-en-jeu.md`.

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
| 0.4 | Capture de l'attribution chez le maître du butin | L'interface classique existe : `MasterLooterFrame`, `MasterLooterFrame_GiveMasterLoot`, `GiveMasterLoot`, `GetMasterLootCandidate`, `IsMasterLooter`. Le 3 octobre, en donjon à 5 (La salle des Thanes) : à l'ouverture du corps, chaque objet au-dessus du seuil liste ses candidats (« 1=Ðéjà Vu, 2=Djey Bouc, 3=Ly Reht… »). L'attribution par le menu est captée par `GiveMasterLoot` : « [Maillet de bouleau du gorille] attribué à Ly Reht », confirmée à tous par CHAT_MSG_LOOT. Les numéros d'emplacement ne bougent pas quand les autres objets sont ramassés. | ✅ | Le maître du butin enregistre chaque attribution au moment où il la fait. |
| 0.4 | Attribution visible chez les autres joueurs | En butin de groupe, `C_LootHistory.GetSortedInfoForDrop` donne pour chaque objet le gagnant (prénom nom, classe, GUID, jet de dés) et l'identifiant de rencontre (0 pour un monstre ordinaire). Les jets d'un butin de boss durent 3 minutes. CHAT_MSG_LOOT donne aussi « Prénom Nom reçoit le butin ». ENCOUNTER_LOOT_RECEIVED ne se déclenche jamais. | ✅ | Suivi automatique du loot possible sans maître du butin, chez n'importe quel membre. |
| 0.5 | Format des noms | `UnitName` et `UnitFullName` renvoient le **prénom** (« Ðéjà ») puis le **nom de famille** (« Vu ») à la place du royaume. `GetUnitName(unit, true)`, l'expéditeur des messages addon, la liste de guilde et la cible des chuchotements utilisent tous « Prénom Nom » avec une espace. Pas de serveur, mais un type de monde (PvE, PvP, RP, HC) : `GetRealmName()` renvoie « Classic Beta PvP ». Caractères accentués sur plusieurs octets. | ✅ | Un personnage = prénom + nom de famille, stockés séparément. Le couple est unique dans tout le jeu, tous types de monde confondus : c'est la clé naturelle du personnage. Le type de monde est un réglage de la guilde. Lecture via une seule fonction Compat. |
| 0.5 | Noms secrets hors combat / en combat | Monstre ciblé en combat : nom secret. Joueur lui-même et membres du groupe : lisibles, même pendant un boss. | ✅ | Seuls les noms des ennemis sont secrets. Ne jamais dépendre du nom d'un monstre. |
| 0.5 | Liste de guilde : nom, classe, rang | 38 membres lus : « Prénom Nom » pour tous, classe (SHAMAN, ROGUE…), indice et nom du rang, niveau, en ligne. Une 2e demande moins de 10 s après la première ne déclenche pas de mise à jour. | ✅ | Export de la liste par l'addon des officiers faisable (P4.7, P2.4). Ne pas redemander la liste plus d'une fois toutes les 10 s. |
| 0.6 | SavedVariables relues après /reload | Oui : chargements 1, 2, 3 enchaînés, journal conservé, bloc de 64 Ko relu intact | ✅ | Le bug de la bêta semble corrigé sur le build 70170. |
| 0.6 | SavedVariables relues après redémarrage | Oui : chargement n° 4 après sortie complète du jeu, bloc de 64 Ko intact | ✅ | |
| 0.6 | Fichier externe lu après /reload | Oui : 64 Ko écrits jeu ouvert, lus après /reload | ✅ | Valide la descente des données par le compagnon (partie `VXV/Sync` de l'addon). |
| 0.6 | Taille maximale du fichier externe | 2 Mo lus sans erreur, après /reload et après redémarrage | ✅ | Largement suffisant pour les données de la guilde. |
| 0.6 | Contournement seed | Inutile : les SavedVariables sont relues normalement | ✅ | Abandonné. |

## Compléments du 3 octobre (T1 à T10)

| Test | Question | Résultat | Verdict | Impact sur le plan |
| --- | --- | --- | --- | --- |
| T1 | L'addon invite-t-il un « Prénom Nom » et passe-t-il le groupe en raid, avec et sans clic ? | Avec clic : oui. `C_PartyInfo.InviteUnit("Prénom Nom")` invite, même écrit en minuscules (« tito muldoon » devient « Tito Muldoon »). Le groupe est créé dès l'invitation, avant la réponse. Le refus est annoncé dans le canal système (« X refuse votre invitation »). `ConvertToRaid()` donne « Groupe converti en raid ». Sans clic (3 s après une commande) : invitation envoyée et acceptée, passage en raid réussi, aucune action bloquée. | ✅ | Invitations automatiques des inscrits faisables, même sans clic du chef de raid (P5) |
| T2 | Le maître du butin peut-il donner un objet depuis l'addon, avec et sans clic ? | Avec clic : oui. `GiveMasterLoot(emplacement, candidat)` appelé par l'addon donne l'objet au candidat choisi : « Hache double d'esprit » à Codéine Fordragon, en plein combat contre Faldrim Courbenclume ; « Brassards brindecieux » à Haldren Vaelor après le combat. Le jeu le confirme à tous (« reçoit le butin »). Sans clic (`/vxvtest later loot give`) : réussi selon le propriétaire, qui l'a observé en jeu ; l'essai n'apparaît pas dans le journal de la sonde. | ✅ | Bouton « donner » dans la liste des SR (P6), utilisable même pendant un boss. |
| T3 | Les `/roll` de tous les joueurs sont-ils lisibles (nom, jet, bornes) ? | Les siens : oui. Message système « Ðéjà Vu obtient un 98 (1-100). », découpé grâce au format du jeu `RANDOM_ROLL_RESULT` (« %s obtient un %d (%d-%d). »), nom au format « Prénom Nom ». Les rolls des autres joueurs sont lus de la même façon (« [Haldren Vaelor] 73 (1-100) », « [Ly Reht] 17 (1-100) »). Une série en cascade (1-26, 1-15… jusqu'à 0-1) est lue avec les bonnes bornes. Pendant un boss, le message système est secret : un `/roll` y est illisible. | ✅ | Rolls SR et SR+ (P6), deathroll (P15), toujours après la rencontre de boss |
| T4 | L'addon lit-il et écrit-il dans le canal raid, y compris pendant un boss ? | Hors boss : oui, avec et sans clic. Le message envoyé sur RAID par le chef revient en CHAT_MSG_RAID_LEADER, et les messages des autres joueurs sont lisibles. Pendant un boss (Faldrim Courbenclume), l'envoi est bloqué par le client (ADDON_ACTION_BLOCKED), même depuis une commande tapée. Les messages du groupe et les messages système y sont aussi secrets, expéditeur et texte compris. Juste après ENCOUNTER_END, envoi et lecture redeviennent normaux. Avertissement de raid : pas testé. | ⚠️ | Annonces en file d'attente pendant une rencontre de boss, envoyées après ENCOUNTER_END (même règle que les messages addon). Rien ne doit dépendre du chat pendant un boss. |
| T5 | Un bouton de l'addon peut-il lancer un `/roll`, et sans clic ? | Oui dans les deux cas : `RandomRoll(1, 100)` depuis un bouton, puis 3 s après une commande, hors de tout clic. Aucune action bloquée. | ✅ | Bouton de roll (P6, P15) |
| T6 | Les morts et résurrections du groupe sont-elles visibles sans journal de combat ? | Morts : oui. Pendant un wipe sur Infurnus, la surveillance (`UnitIsDeadOrGhost` chaque seconde) a vu chaque mort avec le nom, en plein boss : Dark Sasukey, Ly Reht, Ðéjà Vu, Haldren Vaelor, Codéine Fordragon. PLAYER_DEAD se déclenche pour le joueur. Résurrection : RESURRECT_REQUEST donne le nom complet du soigneur (« Ly Reht »), puis PLAYER_ALIVE quand le joueur accepte. Le canal système annonce aussi les morts du groupe (« Ly a succombé. »), mais avec le prénom seul. | ✅ | Titres liés aux morts et aux résurrections (P13) : chaque membre signale ses morts et qui l'a relevé. |
| T7 | Le compteur de dégâts et de soins du jeu est-il lisible par l'addon ? | Oui, après le combat, pour tout le groupe. `C_DamageMeter` offre 8 fonctions : sessions par type ou par identifiant, détail par combattant, durée, remise à zéro. Il compte 11 types, dont dégâts, soins, absorptions, interruptions, dissipations et morts. Une session est gardée par combat (nom du monstre, durée), plus le cumul. En groupe, après le combat : nom, classe, montant, par seconde et GUID de chaque membre (Haldren Vaelor 710, Ly Reht 543, Codéine Fordragon 425, Ðéjà Vu 392 ; soins de Dark Sasukey 461). Pendant le combat, montants, noms et GUID sont secrets ; seuls la classe et « c'est moi » restent lisibles. Un joueur qui a quitté le groupe reste dans le cumul, mais avec un nom secret. | ✅ | Titres de dégâts et de soins faisables (P13) : lire le compteur à la fin de chaque combat (après ENCOUNTER_END), avant que des joueurs quittent le groupe. Le type « morts » peut compléter T6. |
| T8 | Quelles statistiques du jeu sont lisibles ? | Toutes celles de l'onglet Statistiques, hors combat. Un monstre tué fait évoluer 5 compteurs : Créatures tuées (923 → 924), Nombre total de victimes, Coups fatals en extérieur, Nombre total de coups fatals, Type de créature le plus tué (« 318 (Bêtes) » → « 319 (Bêtes) »). | ✅ | Missions et titres fondés sur les compteurs du jeu (P12, P13). La mission « monstres gris » est abandonnée. |
| T9 | Peut-on afficher un titre dans l'infobulle, le canal de guilde et la liste de guilde ? | Infobulle : ligne ajoutée par `TooltipDataProcessor.AddTooltipPostCall`. Canal de guilde : message préfixé par le titre, grâce au filtre des messages. Liste de guilde : fenêtre moderne `CommunitiesFrame`, chargée dès la connexion. L'accroche par le mixin n'a rien donné. L'accroche sur les lignes de la liste (`ScrollUtil.AddInitializedFrameCallback`, qui passe le propriétaire avant la ligne) fonctionne : « titre ajouté à Агент Режима » (sonde 0.2.2). | ✅ | Affichage des titres (P13) |
| T10 | Les métiers et recettes connues du joueur sont-ils lisibles ? | Oui. `GetProfessions` et `GetProfessionInfo` : 4 métiers avec niveau (Herboristerie 95/150, Dépeçage 104/150, Secourisme 22/75, Cuisine 6/75). À l'ouverture de chaque fenêtre de métier, `C_TradeSkillUI` donne les recettes connues avec identifiant et nom (3275 Bandage en lin, 2538 Viande de loup grillée…). Les métiers de récolte ont aussi des recettes (Herboristerie : Bougie d'encens). | ✅ | Annuaire des artisans (P14) |

## Habillage (5 octobre)

Client bêta, interface en français, écran de 2048 × 1152 unités d'interface (échelle 0,667) ; capture d'écran du
propriétaire et journal de la sonde.

| Point mesuré | Résultat | Conséquence pour l'addon |
| --- | --- | --- |
| Textures TGA et PNG depuis le dossier de l'addon, filtrage `NEAREST` | Affichées, nettes | PNG, beaucoup plus léger (272 Ko contre 2,6 Mo en TGA RLE pour la taverne) |
| Texture hors puissance de deux (d20 223 × 256) | Affichée, en TGA comme en PNG | La taverne reste en 1589 × 672, sans marge |
| Texture répétée : `SetTexture(fichier, "REPEAT", "CLAMP")` et `SetTexCoord` au-delà de 1 (capture du 9 octobre) | Répétée sur toute la largeur : les pointillés de l'onglet Quêtes s'affichent | Lignes pointillées tirées d'un motif de 8 × 1 pixels (`VXV/Missions/Media/dash.png`) |
| Polices TTF de l'addon (`FontString:SetFont`) | Chargées, mais en différé : le premier appel renvoie `false` le temps que le fichier se charge, les suivants `true` | Objets de police créés au chargement, réappliqués tant que le jeu répond `false` |
| Alphabets : latin, cyrillique, chinois, coréen | Pixelify : latin, cyrillique sauf la majuscule « О » ; Manrope : latin et cyrillique ; ni l'une ni l'autre n'a le chinois ni le coréen ; la police du jeu affiche tout | Familles de polices ; le propriétaire préfère le rendu de la famille Pixelify mixte, malgré le « О » cyrillique manquant |
| `CreateFontFamily` (nos polices pour le latin et le cyrillique, celles du jeu pour le reste) | Fonctionne : `Fonts\2002.TTF` (coréen), `Fonts\ARKai_T.ttf` (chinois simplifié), `Fonts\blei00d.TTF` (chinois traditionnel), lues par `GetFontObjectForAlphabet` | Famille Pixelify : Pixelify (latin et cyrillique), polices du jeu (chinois, coréen). Famille Manrope : Manrope (latin, cyrillique), polices du jeu |
| `RAID_CLASS_COLORS`, `C_ClassColor.GetClassColor` | Présentes ; guerrier `ffc69b6d`, comme nos jetons | Couleurs lues dans le jeu, nos jetons en secours |
| `UnitRace`, `UnitSex`, `UnitClass` | Présentes (« Elfe de la nuit » `NightElf`, 2, « Voleur » `ROGUE`) | Avatars du joueur (race × classe × sexe) |
| `SetBlendMode("ADD")`, `AnimationGroup` d'animations `Alpha` | Créées sans erreur ; la lueur clignote bien par paliers (vu par le propriétaire) | Lueurs de la taverne |

## Build 70235 (6 octobre)

| Point mesuré | Résultat |
| --- | --- |
| Inventaire de l'API | `PlaySound` et `SOUNDKIT` présents. Anciennes globales absentes : `InviteUnit`, `ConvertToRaid`, `GetNumSkillLines`, `GetNumTradeSkills` (passer par `C_PartyInfo` et `C_TradeSkillUI`) |
| Événements | `PLAYER_ENTERING_WORLD` et `ZONE_CHANGED_NEW_AREA` acceptés à l'enregistrement ; `TRADE_SKILL_UPDATE` refusé, `TRADE_SKILL_LIST_UPDATE` accepté |
| Statistiques (`/vxvtest counters list`) | 196 compteurs, dont « Poissons et autres objets pêchés » (1456) et « Nombre total de victoires honorables » (588) ; aucun compteur de récoltes (herbes, minerais, peaux), seulement le plus haut niveau de compétence |

## Complément du 7 octobre (T11) : vers le compagnon sans `/reload`

Session du 7 octobre, build 70245, sonde 0.4.0 (`docs/phase-0/sessions/2026-10-07.txt`), fichiers lus sur le disque
pendant la partie.

| Test | Question | Résultat | Statut | Conséquence |
| --- | --- | --- | --- | --- |
| T11 activation | L'addon peut-il allumer seul, sans clic, le journal de combat et le journal du chat ? | Oui : `LoggingCombat(true)`, `LoggingChat(true)` et `SetCVar("advancedCombatLogging", "1")` depuis un délai, sans action bloquée. Aussi présents : `C_ChatInfo.IsLoggingCombat`, `C_ChatInfo.IsLoggingChat`. | ✅ | — |
| T11 journal de combat | Le journal de combat s'écrit-il pendant la partie, et que contient-il ? | Oui, au fil de l'eau (`Logs/WoWCombatLog-<date>.txt`, lignes vues quelques secondes après le combat), version 22, mode avancé. Soins donnés et reçus (`SPELL_HEAL`, `SPELL_PERIODIC_HEAL` avec la cible), dégâts, morts (`UNIT_DIED`), monstres tués (`PARTY_KILL`), et tous les joueurs proches, pas seulement le groupe. Les joueurs n'y figurent que par leur prénom et leur type de monde (`"Ðéjà-ClassicBetaPvP-"`, sans le nom de famille) et leur GUID (`Player-4619-00F6AB29`) : le nom complet se retrouve par le GUID, que l'addon connaît (`UnitGUID`). Rencontres de boss (`ENCOUNTER_START` / `ENCOUNTER_END`) : voir le raid du soir, ci-dessous. | ✅ | Le compagnon peut lire le combat en direct : morts, dégâts, soins reçus (Princesse mesurable), sans `/reload`. Rien d'autre que du combat. |
| T11 journal du chat | Le journal du chat s'écrit-il pendant la partie ? | Non : `Logs/WoWChatLog.txt` reste vide (0 octet) pendant la partie, après `LoggingChat(false)` et après un `/reload` ; il est écrit en une fois à la fermeture du jeu. Il contient les chuchotements et les messages de canal, pas l'affichage de l'addon ni les messages d'addon. | ❌ | Pas mieux que les données sauvegardées, écrites à la déconnexion : abandonné. |
| T11 envois sans clic | Quels messages l'addon peut-il envoyer sans clic ? | Chuchotement à soi-même (« Ðéjà Vu » comme « Ðéjà-Vu ») et messages d'addon (chuchotement à soi, guilde) : oui. Canal privé (`JoinChannelByName` accepté sans clic) : envois refusés (`ADDON_ACTION_BLOCKED` pour les 9 premiers), 3 des 4 suivants arrivés 11 s plus tard. | ⚠️ | Canal privé inutilisable sans clic. |

Raid du soir à 5 dans La salle des Thanes, VXV et le compagnon 1.4 ouverts (`Logs/WoWCombatLog-100726_225845.txt`, données
sauvegardées de VXV/Raid) :

| Test | Question | Résultat | Statut | Conséquence |
| --- | --- | --- | --- | --- |
| T11 rencontres de boss | Le journal de combat porte-t-il le début et la fin d'une rencontre de boss ? | Oui : `ENCOUNTER_START,3493,"Faldrim Courbenclume",1,5,3065` puis `ENCOUNTER_END,3493,"Faldrim Courbenclume",1,5,1,21464` (identifiant, nom, difficulté, taille du groupe, succès, durée en ms). Le lecteur du compagnon en tire le boss tué et les soins reçus pendant le combat (Pashi 310, Mirriah 94). | ✅ | Princesse et les boss tués lus en direct par le compagnon (`apps/companion/src/domain/combatLog.ts`). |
| T7 lecture par identifiant | Le compteur se lit-il par l'identifiant de la session du boss, après le combat ? | Oui : en combat, `C_DamageMeter.GetCombatSessionFromID` rend la session, montants et noms secrets (sonde) ; hors combat, VXV/Raid l'a lue au boss tué avec les chiffres de chacun : dégâts de Ðéjà Vu 664, Wazz Tataz 411, Mirriah Belilou 373, Pashi Dewm 345 ; soins de Cataleya Odc 404. | ✅ | Titres de dégâts et de soins à partir du journal de raid (`VXV/Raid/Meter.lua`). |

Bilan : seul le journal de combat porte des données pendant la partie, et seulement du combat. Les SR, inscriptions,
mises, deathrolls et changements faits en jeu restent portés par les données sauvegardées (`/reload` ou déconnexion).
La sonde laisse le mode avancé du journal de combat allumé (`advancedCombatLogging` à 1, réglage du jeu).

## Hypothèses de départ (sources communautaires)

| Hypothèse | Résultat |
| --- | --- |
| Interface 16001, client Mainline 12.x avec valeurs secrètes | ✅ Confirmée |
| SavedVariables écrites à la sortie mais non relues | ❌ Infirmée sur le build 70170 : relues normalement |
| `COMBAT_LOG_EVENT_UNFILTERED` refusé | ✅ Confirmée (interdit, sans erreur Lua) |
| `GetItemInfo` absent, remplacé par `C_Item.GetItemInfo` | ✅ `C_Item.GetItemInfo` présent ; l'ancienne globale n'a pas été testée |

## Stratégie de synchro

Confirmée.

- **Descente** (serveur vers jeu) : le compagnon écrit un fichier Lua dans la partie `VXV/Sync` de l'addon, lu au prochain `/reload` ou lancement. ✅ Confirmé jusqu'à 2 Mo.
- **Remontée** (jeu vers serveur) : le compagnon lit les SavedVariables, écrites à chaque `/reload` et à la déconnexion, et relues par le jeu au lancement suivant. ✅ Confirmé.
- **Entre joueurs connectés** : messages addon sur GUILD, RAID et PARTY. ✅ Confirmé, avec les limites de la section 0.3.
