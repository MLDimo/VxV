# Données des raids

Un fichier JSON par raid. Ajouter un raid, c'est ajouter un fichier ici : aucun code à modifier.
`npm run check` valide tous les fichiers ; le générateur en tire les packs de l'addon et les données de la base.

## Format

Le nom du fichier est l'identifiant du raid : minuscules et tirets, par exemple `mont-hyjal.json`.
Extrait réel de `salle-des-thanes.json` :

```json
{
  "name": "La salle des Thanes",
  "instanceId": 3065,
  "bosses": [
    {
      "encounterId": 3493,
      "name": "Faldrim Courbenclume",
      "loot": [{ "itemId": 271096, "name": "Brassards brindecieux" }]
    }
  ]
}
```

| Champ | Sens | Où le trouver en jeu |
| --- | --- | --- |
| `name` | Nom affiché du raid | — |
| `instanceId` | Identifiant de l'instance | `/vxvtest loot status`, valeur « id » |
| `bosses` | Boss dans l'ordre habituel des combats | — |
| `encounterId` | Identifiant de la rencontre | Événement `ENCOUNTER_START` dans le journal de la sonde |
| `loot` | Objets que le boss peut donner | Journal d'aventure, ou lignes « butin attribué » de la sonde |
| `itemId` | Identifiant de l'objet | Nombre après `item:` dans un lien d'objet |

Règles vérifiées : champs obligatoires et sans faute de frappe, au moins un boss par raid et un objet par boss, identifiants uniques entre tous les raids, et un même objet toujours sous le même nom.

Le type des objets (tissu, mailles, dague, arme à deux mains…) ne s'écrit pas ici : l'addon de chaque membre le lit
dans le jeu et l'envoie au site par le compagnon, qui en déduit les classes qui peuvent les équiper.

## Fichiers actuels

- `salle-des-thanes.json` : donjon de la bêta, relevé en jeu le 2026-10-02 (un objet confirmé par boss). Il sert à valider la chaîne de données en attendant les tables de butin d'Onyxia, du Mont Hyjal et des Profondeurs des tertres (ouverture le 9 décembre).
