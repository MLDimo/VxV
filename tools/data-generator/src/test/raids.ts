import type { Raid } from "@vxv/raid-data";

/** Two small raids used across the generator tests, with an apostrophe to exercise escaping. */
export const onyxia: Raid = {
  id: "onyxia",
  name: "Repaire d'Onyxia",
  instanceId: 249,
  bosses: [
    {
      encounterId: 1084,
      name: "Onyxia",
      loot: [
        { itemId: 18423, name: "Tête d'Onyxia" },
        { itemId: 17966, name: "Sac en peau d'Onyxia" },
      ],
    },
  ],
};

export const salleDesThanes: Raid = {
  id: "salle-des-thanes",
  name: "La salle des Thanes",
  instanceId: 3065,
  bosses: [
    { encounterId: 3493, name: "Faldrim Courbenclume", loot: [{ itemId: 271096, name: "Brassards brindecieux" }] },
    { encounterId: 3495, name: "Infurnus", loot: [{ itemId: 271095, name: "Croc de Magmatus" }] },
  ],
};
