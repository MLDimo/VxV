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
| Lignes `ENCOUNTER_START` et `ENCOUNTER_END` du journal de combat | Tuer un boss dans « La salle des Thanes » avec VXV et le compagnon 1.4 ouverts : le compagnon doit envoyer le combat au site | Lecture des boss tués par le compagnon (`apps/companion/src/domain/combatLog.ts`) |
| Compteur de dégâts lu par identifiant (`C_DamageMeter.GetCombatSessionFromID`) | Après un combat : `/vxvtest meter read` | Titres de dégâts et de soins (`VXV_Raid/Meter.lua`) |
| Inventaire de l'API sur le client de la sortie (4 novembre) | `/vxvtest api run`, puis `/reload` ; copier le journal dans `sessions/` | Liste des fonctions permises aux bundles (`tools/addon-harness/src/foreverApi.ts`) |

## Validations en jeu

| Domaine | Test |
| --- | --- |
| Bot Discord | Un second compte sur le serveur : `/vxv_main`, puis inscription par le bouton d'un raid |
| Raid | Essai à deux joueurs au moins (données de l'événement, diffusion, invitations), puis un raid de 40 formé sans invitation manuelle |
| Butin | Un raid réel enregistré sans saisie manuelle (répétition possible en donjon avec un maître du butin avant la fin de la bêta) |
| Mode réduit | Le mode réduit dans « La salle des Thanes » (seul pack de la bêta) : prochain boss, son butin, l'alerte de SR |
| Prochain boss | L'alerte sur un raid qui enchaîne deux instances (raids ouverts le 9 décembre) |
| Inscriptions | Une inscription faite en jeu apparaît sur Discord après la synchro du compagnon |
| Rôle d'un raid | Un événement réservé à « Raideur R1 » créé en jeu (rôles apportés par le compagnon d'un officier) : un membre sans ce rôle est refusé, puis inscrit dès que Discord le lui donne |
| Paris | Un pari réel mené jusqu'au versement des gains |
| Missions | Une mission d'une semaine menée jusqu'au classement |
| Titres | Une réattribution réelle un mercredi (rôles Discord et annonce), puis les titres vus en jeu par un membre sans compagnon |
| Artisans | Une recette apprise apparaît chez un autre membre après la synchro |
| Deathroll | Une partie complète jouée aux boutons entre deux membres, la dette chez le perdant |
