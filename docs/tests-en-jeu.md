# Tests encore à faire en jeu

Ce que les tests automatiques ne peuvent pas prouver : les mesures qui manquent sur le client de WoW Forever, et les
parcours réels à jouer une fois. Un test fait sort de cette liste ; une mesure faite va dans les résultats de la sonde
(`docs/phase-0/resultats.md`).

## Mesures manquantes (sonde)

La sonde `tools/VXV_Probe` (addon de test, jamais distribué) s'installe avec
`tools/install-probe.sh "<dossier du client>"`, après `npm run check` si elle a changé. En jeu, `/vxvtest` donne
l'aide et `/vxvtest report` le journal, à copier dans `docs/phase-0/sessions/<date>.txt` (il est aussi écrit à chaque
`/reload` dans `WTF/Account/<COMPTE>/SavedVariables/VXV_Probe.lua`). Les tests de l'addon lisent ces journaux : une
fonction n'est permise aux bundles que si la sonde l'a vue.

| Mesure | Comment | Ce qui en dépend |
| --- | --- | --- |
| Message système d'un duel (`DUEL_WINNER_KNOCKOUT`, `DUEL_WINNER_RETREAT`) | Un `/duel` programmé sur le site entre deux membres avec VXV : le résultat doit partir au site ; sinon `/run print(DUEL_WINNER_KNOCKOUT)` et copier le message du chat | Résultat des duels lu en jeu (`VXV_PvP/DuelResults.lua`) ; sans lui, le perdant reconnaît sa défaite |
| Inventaire de l'API sur le client de la sortie (4 novembre) | `/vxvtest api run`, puis `/reload` ; copier le journal dans `sessions/` | Liste des fonctions permises aux bundles (`tools/addon-harness/src/foreverApi.ts`) |

## Validations en jeu

| Domaine | Test |
| --- | --- |
| Raid | Essai à deux joueurs au moins (données de l'événement, diffusion, invitations), puis un raid de 40 formé sans invitation manuelle |
| Butin | Un raid réel enregistré sans saisie manuelle (répétition possible en donjon avec un maître du butin avant la fin de la bêta) |
| PvP | Un événement PvP créé en jeu par un officier, les fanions de l'Elo dans l'onglet Duels, un défi lancé en jeu à sa cible et relevé par le défié, le pari du duel misé par un tiers, le résultat réglé |
| Paris | Un pari réel mené jusqu'au versement des gains |
| Missions | Une mission d'une semaine menée jusqu'au classement |
| Titres | Une réattribution réelle un mercredi (rôles Discord et annonce), puis les titres vus en jeu par un membre sans compagnon |
| Artisans | Une recette apprise apparaît chez un autre membre après la synchro |
| Deathroll | Une partie complète jouée aux boutons entre deux membres, chaque roll de 0 au résultat précédent (le jeu accepte-t-il un `/roll` à partir de 0 ?) jusqu'au premier 0, la dette chez le perdant |
