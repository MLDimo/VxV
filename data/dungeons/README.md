# Données des donjons

Un fichier JSON par donjon, pour la quête « Donjons en guilde » : un donjon compte quand le groupe tue son dernier
boss, avec un autre membre de la guilde équipé de VXV. Ajouter un donjon, c'est ajouter un fichier ici : aucun code à
modifier. `npm run check` valide tous les fichiers ; `npm run generate` en tire les données de l'addon
(`addon/VXV/Missions/Dungeons.lua`, à valider avec le JSON : un test vérifie qu'il est à jour).

Le nom du fichier est l'identifiant du donjon : minuscules et tirets, par exemple `salle-des-thanes.json`. Exemple
relevé sur la bêta (le 2 octobre) :

```json
{
  "name": "La salle des Thanes",
  "instanceId": 3065,
  "lastBoss": { "encounterId": 3496, "name": "Durgen Mornemartel" }
}
```

| Champ | Sens | Où le trouver en jeu |
| --- | --- | --- |
| `name` | Nom affiché du donjon | — |
| `instanceId` | Identifiant de l'instance | `/vxvtest loot status`, valeur « id » |
| `lastBoss.encounterId` | Identifiant de la rencontre du dernier boss | Événement `ENCOUNTER_END` dans le journal de la sonde |
| `lastBoss.name` | Nom du dernier boss | — |

Chaque valeur se relève en jeu : un identifiant deviné ne compterait rien, ou compterait un autre boss.

## Fichiers actuels

Aucun : chaque donjon s'ajoute une fois son dernier boss relevé sur le serveur officiel.
