# Tests encore à faire en jeu

Ce que les tests automatiques ne peuvent pas prouver : les mesures qui manquent sur le client de WoW Forever, et les
parcours réels à jouer une fois. Un test fait sort de cette liste ; une mesure faite va dans les résultats de la sonde
(`docs/phase-0/resultats.md`).

## Mesures manquantes (sonde)

La sonde `tools/VXV_Probe` (addon de test, jamais distribué) s'installe avec
`tools/install-probe.sh "<dossier du client>"`, après `npm run check` si elle a changé. En jeu, `/vxvtest` donne
l'aide, `/vxvtest chat` montre le journal dans le chat au fil de l'eau (la sonde se tait par défaut) et `/vxvtest report` le journal, à copier dans `docs/phase-0/sessions/<date>.txt` (il est aussi écrit à chaque
`/reload` dans `WTF/Account/<COMPTE>/SavedVariables/VXV_Probe.lua`). Les tests de l'addon lisent ces journaux : une
fonction n'est permise aux bundles que si la sonde l'a vue.

| Mesure | Comment | Ce qui en dépend |
| --- | --- | --- |
| Message système d'un duel (`DUEL_WINNER_KNOCKOUT`, `DUEL_WINNER_RETREAT`) | Un `/duel` programmé sur le site entre deux membres avec VXV : le résultat doit partir au site ; sinon `/run print(DUEL_WINNER_KNOCKOUT)` et copier le message du chat | Résultat des duels lu en jeu (`VXV/PvP/DuelResults.lua`) ; sans lui, le perdant reconnaît sa défaite |
| Victoire en champ de bataille (`GetBattlefieldWinner` : 0 Horde, 1 Alliance ; `UnitFactionGroup("player")`) | Un champ de bataille gagné, puis un perdu, avec un autre membre équipé de VXV dans le groupe : la quête « Champs de bataille en guilde » doit compter la victoire seule ; sinon `/run print(GetBattlefieldWinner(), UnitFactionGroup("player"))` sur l'écran des scores | Quête des champs de bataille en guilde (`VXV/Missions/GuildRuns.lua`) ; sans elle, rien ne compte |
| Dernier boss de chaque donjon du serveur officiel | Avec la sonde, finir le donjon : `/vxvtest loot status` (id de l'instance) et l'`ENCOUNTER_END` du dernier boss ; un fichier par donjon dans `data/dungeons` | Quête des donjons en guilde : un donjon absent de `data/dungeons` ne compte pas |
| Recette lue fenêtre fermée (`C_TradeSkillUI.GetRecipeInfo`, `GetRecipeSchematic`, `GetCategoryInfo`, `GetRecipeItemLink`, `C_Spell.GetSpellTexture`) | Sur un perso, ouvrir la fenêtre d'un de ses métiers (la sonde garde 5 recettes), la fermer, puis sur un autre perso `/vxvtest lien details` et `/reload` | Métier d'un membre hors ligne dans une fenêtre de l'addon (icône, catégorie, objet, composants), pour plus tard (décision du propriétaire du 9 novembre) |
| Inventaire de l'API sur le client de la sortie (4 novembre) | `/vxvtest api run`, puis `/reload` ; copier le journal dans `sessions/` | Liste des fonctions permises aux bundles (`tools/addon-harness/src/foreverApi.ts`) |

## Validations en jeu

| Domaine | Test |
| --- | --- |
| Raid | Essai à deux joueurs au moins (données de l'événement, diffusion, invitations), puis un raid de 40 formé sans invitation manuelle |
| Butin | Un raid réel enregistré sans saisie manuelle (répétition possible en donjon avec un maître du butin avant la fin de la bêta) |
| Butin | En donjon, maître du butin : un objet choisi puis « Lancer l'attribution », donné tout seul au gagnant à la fin des rolls, corps ouvert ; puis un corps fermé pendant les rolls et rouvert : « Donner à… » donne le bon objet au bon joueur |
| PvP | Un événement PvP créé en jeu par un officier, les fanions de l'Elo dans l'onglet Duels, un défi lancé en jeu à sa cible et relevé par le défié, le pari du duel misé par un tiers, le résultat réglé |
| Paris | Un pari réel mené jusqu'au versement des gains |
| Missions | Une mission d'une semaine menée jusqu'au classement |
| Titres | Une réattribution réelle un mercredi (rôles Discord et annonce), puis les titres vus en jeu par un membre sans compagnon |
| Artisans | Une recette apprise apparaît chez un autre membre après la synchro ; un membre connecté a ouvert sa fenêtre de métier avec la version 1.3.1 : chez un autre, « en ligne » à côté de lui dans l'annuaire, et un clic ouvre la vraie fenêtre de son métier ; « forge » trouve les forgerons |
| Pêche | Une session dans l'onglet Artisans › Pêche : canne équipée, trois prises à la touche, l'appât posé, « Quitter la session » rend l'arme |
| Deathroll | Une partie complète jouée aux boutons entre deux membres : le dé qui flotte puis roule, le résultat et l'historique seulement une fois les chiffres arrêtés, le fond qui rougit, « VICTOIRE » et « A goûté le sol » ; la taille réduite (« - ») ; la dette chez le perdant, puis dans l'historique une fois payée ; la partie sur le site (Dernières parties, Journal) après un `/reload` |
| Le Dé Pipé | Un défi accepté : l'annonce « [VXV] … contre … » arrive dans le chat de guilde, envoyée par le défié, avec « [Regarder] » au bout ; un troisième membre clique dessus et la fenêtre de la partie s'ouvre |
| Dettes | Un membre à moins de 100 po de dettes joue et parie encore ; à 100 po, défis et paris refusés en jeu et sur le site |
