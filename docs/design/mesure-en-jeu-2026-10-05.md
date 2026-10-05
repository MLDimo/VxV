# Mesure en jeu de la charte (habillage, étape 3) — 5 octobre 2026

Sonde 0.3.0, `/vxvtest design show`, client bêta de WoW Forever, interface en français, écran de 2048 × 1152 unités
d'interface (échelle 0,667). Capture d'écran du propriétaire et journal de la sonde.

| Point mesuré | Résultat | Conséquence pour l'addon |
| --- | --- | --- |
| Textures TGA et PNG depuis le dossier de l'addon, filtrage `NEAREST` | Affichées, nettes | PNG, beaucoup plus léger (272 Ko contre 2,6 Mo en TGA RLE pour la taverne) |
| Texture hors puissance de deux (d20 223 × 256) | Affichée, en TGA comme en PNG | La taverne reste en 1589 × 672, sans marge |
| Polices TTF de l'addon (`FontString:SetFont`) | Chargées, mais en différé : le premier appel renvoie `false` le temps que le fichier se charge, les suivants `true` | Objets de police créés au chargement, réappliqués tant que le jeu répond `false` |
| Alphabets : latin, cyrillique, chinois, coréen | Pixelify : latin, cyrillique sauf la majuscule « О » ; Manrope : latin et cyrillique ; ni l'une ni l'autre n'a le chinois ni le coréen ; la police du jeu affiche tout | Familles de polices ; le propriétaire préfère le rendu de la famille Pixelify mixte (4ᵉ colonne de la planche), malgré le « О » cyrillique manquant |
| `CreateFontFamily` (nos polices pour le latin et le cyrillique, celles du jeu pour le reste) | Fonctionne : `Fonts\2002.TTF` (coréen), `Fonts\ARKai_T.ttf` (chinois simplifié), `Fonts\blei00d.TTF` (chinois traditionnel), lues par `GetFontObjectForAlphabet` | Famille Pixelify : Pixelify (latin et cyrillique, choix du propriétaire), polices du jeu (chinois, coréen). Famille Manrope : Manrope (latin, cyrillique), polices du jeu |
| `RAID_CLASS_COLORS`, `C_ClassColor.GetClassColor` | Présentes ; guerrier `ffc69b6d`, comme nos jetons | Couleurs lues dans le jeu, nos jetons en secours |
| `UnitRace`, `UnitSex`, `UnitClass` | Présentes (« Elfe de la nuit » `NightElf`, 2, « Voleur » `ROGUE`) | Avatars du joueur (race × classe × sexe) |
| `SetBlendMode("ADD")`, `AnimationGroup` d'animations `Alpha` | Créées sans erreur | Lueurs de la taverne |
