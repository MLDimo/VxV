# VXV — Spécification graphique (site + addon)

> Référence de design validée le 5 octobre 2026. Ce document décrit **uniquement la partie visuelle** :
> où va chaque élément, pourquoi, et comment le reproduire. La logique métier, les données et l'architecture
> sont déjà dans les briefs précédents ; rien ici ne les remplace.
>
> Contenu du dossier :
> - `assets/` — images finales (taverne, d20, avatars, logo, emblème) et polices web.
> - `maquettes/` — sources HTML des maquettes validées (CSS inline exact, à lire comme référence de valeurs).
> - `captures/` — rendu attendu de chaque écran (à comparer pixel-à-pixel avec ton implémentation).
>
> Dans les maquettes, les images sont appelées par `/_blob/<id>` : voir la table de correspondance §12.

---

## 1. Concept

**Une taverne de la Horde en pixel art, aux couleurs de VXV.** Le site et l'addon partagent la même identité.
La taverne est la page d'accueil : chaque lieu de la scène est une zone cliquable qui ouvre une section.
Les écrans internes reprennent le même univers (bois, cuivre, parchemin, néon violet) sous forme d'interface.

Règles absolues :
- **Pixel art** : angles droits partout, **aucun `border-radius`** (sauf l'emblème rond et le tampon VXV), ombres « en escalier » (box-shadow pleins, pas de flou) pour les reliefs.
- **Horde Classic uniquement** : orc, tauren, mort-vivant, troll (+ paladin mort-vivant à partir de novembre). Jamais de chevalier de la mort ni d'elfe de sang. Les cibles des avis de recherche sont de l'Alliance.
- **Un lieu = un onglet, même nom partout** (site, addon, Discord) :

| Ordre | Onglet | Lieu dans la taverne | Sous-titre |
|---|---|---|---|
| 0 | Taverne | (accueil, la scène elle-même) | — |
| 1 | Raid | Table du conseil de guerre | Raids & SR |
| 2 | Le Dé Pipé | Porte néon rose | Paris & deathroll |
| 3 | Quêtes | Tableau à parchemins | Missions |
| 4 | Ranking | Tableau au-dessus de la cheminée | Classements & titres |
| 5 | Artisans | Forge | Forge & métiers |
| 6 | Journal | Comptoir | Caisse & historique |
| — | JcJ (réservé) | Mur des avis de recherche | **Aucun onglet ni zone cliquable pour l'instant** |

Ordre des onglets dans l'addon : `Taverne · Raid · Le Dé Pipé · Quêtes · Ranking · Artisans · Journal`.
Ordre du menu du site : `Raid · Quêtes · Le Dé Pipé · Ranking · Artisans · Journal` (+ bouton Connexion Discord).

---

## 2. Design tokens

### 2.1 Couleurs VXV (interface)

| Token | Hex | Usage |
|---|---|---|
| `--vxv-amethyst` | `#A35CFF` | accent principal, liserés, focus |
| `--vxv-amethyst-btn` | `#8A3FFC` | fond bouton principal (ombres `#5A1FB0` / `#B98CFF`) |
| `--vxv-sakura` | `#E0479E` | pastilles de notif, sur-titres (kicker), Le Dé Pipé |
| `--vxv-sakura-light` | `#FF8CC8` | titres VXV (◆ …) |
| `--vxv-gold` | `#F2C94C` | survol des lieux, onglet actif (soulignement), récompenses, chiffres de mise |
| `--vxv-night` | `#0B0814` / `#0E0A16` | fond de page / fond de fenêtre addon |
| `--vxv-ink` | `#0D0912` | **contour pixel** (1er anneau de toutes les box-shadows) |
| `--vxv-panel` | `rgba(18,13,26,.88)` (`#120D1A`) | panneaux |
| `--vxv-ivory` | `#F4EFFC` | titres |
| `--vxv-lavender` | `#C9C2EA` | texte courant |
| `--vxv-muted` | `#A49BBD` | texte secondaire, labels |
| `--vxv-line` | `#2E2442` | séparateurs internes |
| `--vxv-gain` | `#7EE2A0` | gains, « présent » |
| `--vxv-loss` | `#F19A9A` | pertes, dettes |

### 2.2 Couleurs taverne (cadres, plaques, parchemin)

| Token | Hex | Usage |
|---|---|---|
| `--wood-night` | `#1A0F0A` | barres d'en-tête, pied de fenêtre |
| `--wood` | `#3A2414` | plaques, boutons bois |
| `--wood-tab` | `#2A1A10` | onglets inactifs |
| `--beam` | `#5B3A1C` | cadres de panneaux (2e anneau) |
| `--copper` | `#8A5A2A` | liseré cuivre (cadres principaux, highlights boutons bois) |
| `--plum` | `#4A2A6A` | onglet actif, plaque survolée |
| `--parchment` | `#F8E7C0` | texte sur bois |
| `--old-paper` | `#D9C39A` | sous-titres sur bois, onglets inactifs |
| `--parch-bg` | `radial-gradient(circle at 30% 20%, #F3E7C9, #E2CFA3 70%, #CDB581)` | parchemins |
| `--ink-brown` | `#3A2614` / `#2A1A0C` | texte sur parchemin |
| `--ember` | `#FFA03C` | lueur feu / forge |
| `--neon` | `#FF5AC8` | lueur porte du Dé Pipé |

### 2.3 Couleurs de classe (noms de joueurs, cadres d'avatar, fanions)

`Guerrier #C69B6D · Chasseur #AAD372 · Voleur #FFF468 · Prêtre #FFFFFF · Chaman #0070DD · Mage #3FC7EB · Démoniste #8788EE · Druide #FF7C0A · Paladin #F48CBA`.
Dans l'addon, lire `RAID_CLASS_COLORS` / `C_ClassColor` plutôt que coder en dur. **Les noms de joueurs sont toujours dans leur couleur de classe**, nulle part ailleurs ces couleurs ne servent de décoration (exception : fanions du Ranking et cadres d'avatar).
Sur fond parchemin (clair), utiliser des versions assombries : guerrier `#7A5530`, chasseur `#4F6E1F`, chaman `#0050A0`, druide `#B04F00`, VXV `#7A2FE0`.

### 2.4 Typographie

| Rôle | Police | Graisse | Tailles de référence |
|---|---|---|---|
| Titres, onglets, plaques, boutons, gros chiffres | **Pixelify Sans** | 600–700 | titre d'écran 30px · titre panneau 16px · onglet 15px · plaque 16px · chiffre deathroll 100px |
| Texte, tableaux, cotes, labels | **Manrope** | 400–800 | texte 13–15px · labels 11–12px · kicker 11px/800 uppercase letter-spacing .16em |

- Jamais Pixelify Sans pour du texte courant.
- Chiffres alignés : `font-variant-numeric: tabular-nums` pour classements et cotes.
- Polices sous licence OFL (Google Fonts). Web : `assets/fonts/*.woff2`. Addon : embarquer les **.ttf** (télécharger depuis Google Fonts) dans `Fonts/`, puis `FontString:SetFont("Interface\\AddOns\\VXV\\Fonts\\PixelifySans-SemiBold.ttf", 15, "")`. Pas d'outline WoW (`""`), on fait l'ombre nous-mêmes si besoin.

### 2.5 Kicker + titre (en-tête de chaque écran)

Toujours le même motif en haut à gauche d'un écran interne :
```
<kicker>  Manrope 11px 800, uppercase, letter-spacing .16em, couleur thématique
<titre>   Pixelify Sans 30px 700, line-height 1, #F4EFFC
```
Couleurs de kicker : Raid `#E0479E` · Le Dé Pipé `#FF5AC8` · Quêtes `#7EE2A0` · Ranking `#F2C94C` · Artisans `#FFA03C` · Journal (pas de kicker, livre ouvert).
À droite de l'en-tête : badges d'état (fond = couleur à 14 % d'opacité, texte = couleur pleine, Manrope 12px 800, sans arrondi).

---

## 3. Primitives pixel (la « grammaire » visuelle)

Tout le relief est fait avec des **box-shadows pleines empilées** (anneaux) — c'est ce qui donne le rendu pixel. Ne jamais utiliser `border-radius`, `blur` dans les ombres de cadre, ni dégradés doux sur les cadres.

```css
/* Contour standard d'un élément : anneau encre puis anneau bois */
box-shadow: 0 0 0 2px #0D0912, 0 0 0 4px #5B3A1C;

/* Cadre principal de fenêtre addon (inset, 4 anneaux) */
box-shadow: inset 0 0 0 3px #0D0912, inset 0 0 0 7px #8A5A2A,
            inset 0 0 0 10px #0D0912, inset 0 0 0 12px #5B3A1C;

/* Bouton pixel principal (biseau) */
.pxbtn { background:#8A3FFC; color:#fff; font:600 16-18px 'Pixelify Sans';
  box-shadow: inset -3px -3px 0 #5A1FB0, inset 3px 3px 0 #B98CFF, 0 0 0 2px #0D0912; }
/* Bouton bois */
.woodbtn { background:#3A2414; color:#F8E7C0 (ou #F2C94C pour action officier);
  box-shadow: inset -3px -3px 0 #1A0F08, inset 3px 3px 0 #8A5A2A, 0 0 0 2px #0D0912; }
/* Bouton or (Roll, CTA mise) */
.goldbtn-solid { background:#F2C94C; color:#1A1206;
  box-shadow: inset -4px -4px 0 #B8860B, inset 4px 4px 0 #FFF2B0, 0 0 0 3px #0D0912; }

/* Onglet */
.tab { min-height:36px; padding:0 12px; background:#2A1A10; color:#D9C39A; font:600 15px 'Pixelify Sans';
  box-shadow: 0 0 0 2px #0D0912, inset 0 -3px 0 #1A0F08; }
.tab[aria-selected=true] { background:#4A2A6A; color:#fff; box-shadow: 0 0 0 2px #0D0912, inset 0 -3px 0 #F2C94C; }

/* Panneau */
.panel { background:rgba(18,13,26,.88); padding:14px; box-shadow:0 0 0 2px #0D0912, 0 0 0 4px #5B3A1C; }
.panel.officer { background:rgba(42,26,10,.9); box-shadow:0 0 0 2px #0D0912, 0 0 0 4px #F2C94C; } /* zone officier = liseré or */

/* Plaque en bois (titres des lieux) */
.plaque { font:600 16px 'Pixelify Sans'; color:#F8E7C0; background:#3A2414; padding:6px 12px;
  box-shadow: 0 0 0 3px #1A0F08, 0 0 0 6px #8A5A2A, 0 6px 0 6px rgba(0,0,0,.35); }
.plaque small { display:block; font:700 11px Manrope; color:#D9C39A; text-align:center; }

/* Pastille de notification */
.badge { min-width:20px; height:20px; background:#E0479E; color:#fff; font:700 12px Manrope;
  box-shadow:0 0 0 2px #0D0912; position:absolute; right:-8px; top:-8px; }

/* Icônes pixel : SVG en <rect> sur grille 3px (burger, croix). Pas d'icônes vectorielles arrondies. */
```

Survol / focus (partout) : la cible passe en prune `#4A2A6A` avec liseré or `#F2C94C`. Focus clavier = même rendu que hover (`:focus-visible`).

---

## 4. La taverne (scène d'accueil)

### 4.1 Image
- `assets/taverne.jpg` — **1589 × 672 px**, ratio **2.3646**. Toutes les positions ci-dessous sont en **% de la largeur / hauteur de la scène** → indépendantes de la taille d'affichage.
- Rendu : `image-rendering: pixelated`.
- Le conteneur a `aspect-ratio: 1589 / 672`, `overflow: hidden`, `container-type: inline-size` (les textes posés sur l'image sont en `cqw` pour scaler avec elle).
- L'image est posée à `left:-1.5%; top:-1.5%; width:103%; height:103%` pour laisser une marge de parallaxe.
- Vignette par-dessus : `radial-gradient(130% 100% at 50% 45%, transparent 60%, rgba(13,9,18,.6) 100%)`.
- Calques futurs (décor / personnages / premier plan) : même cadrage, même résolution ; la parallaxe sera alors différenciée par calque (décor ×1, personnages ×1.6, premier plan ×2.2).

### 4.2 Zones cliquables (hotspots)

`<a class="spot">` (site) / `Button` invisible (addon), positionnés en absolu. Au survol : overlay `rgba(163,92,255,.10)` + `box-shadow: 0 0 0 3px #F2C94C, 0 0 30px 6px rgba(163,92,255,.65)` (transition opacité .2s). La plaque monte de 4px et passe en prune/or.

| Lieu | left | top | width | height | Position de la plaque |
|---|---|---|---|---|---|
| Journal (comptoir) | 0.5% | 22% | 18% | 72% | `top: 36%` du spot (classe `.low`) |
| Quêtes (tableau) | 17.3% | 27% | 13% | 27% | `bottom: calc(100% - 10px)` (touche le haut du tableau) |
| Ranking (cheminée) | 34.6% | 26% | 14.5% | 58% | au-dessus du spot : `bottom: calc(100% + 8px)` |
| Raid (table) | 49.5% | 57% | 24% | 36% | `top: 80%` du spot (au sol, au pied de la table) |
| Le Dé Pipé (porte) | 73.5% | 21% | 11% | 68% | `bottom: 66%` (juste au-dessus de l'arche) |
| Artisans (forge) | 85.5% | 22% | 14% | 72% | `top: 36%` du spot |
| *JcJ (mur avis)* | *≈ 52%* | *≈ 17%* | *≈ 21%* | *≈ 32%* | *réservé — ne pas implémenter* |

Plaque toujours centrée horizontalement (`left:50%; transform:translateX(-50%)`), `white-space: nowrap`. Site : plaque = titre + `<small>` sous-titre. Addon : titre seul (14px).

### 4.3 Données en direct posées sur l'image

| Élément | left | top | width | height | Style |
|---|---|---|---|---|---|
| En-tête « TOP PARIEURS » | 36.9% | 29.4% | 9.2% | 3.6% | Pixelify 700, `0.85cqw`, `letter-spacing .08em`, `#F8E7C0`, centré |
| Ligne 1 (or) | 38.9% | 35.3% | 6.9% | 4.6% | Pixelify `0.95cqw`, nom couleur classe à gauche, gain à droite `#F2C94C` |
| Ligne 2 (argent) | 38.9% | 41.2% | idem | idem | gain `#D9DBE6` |
| Ligne 3 (bronze) | 38.9% | 47.1% | idem | idem | gain `#E0A070` |
| Quête en cours (parchemin vierge) | 22.4% | 38.6% | 4.4% | 9% | Pixelify `0.62cqw`, `line-height 1.1`, nom `#3A2614` en gras + récompense `#8A1F2C` |

Tous ces overlays ont `pointer-events: none` (le clic passe au hotspot).

### 4.4 Lueurs animées (mix-blend-mode: screen, pointer-events: none)

| Lueur | left | top | w | h | Dégradé | Animation |
|---|---|---|---|---|---|---|
| Cheminée | 36% | 60% | 11% | 24% | `radial-gradient(closest-side, rgba(255,160,60,.45), transparent)` | `flick` 1.6s `steps(4)` infinite |
| Porte Dé Pipé | 74.5% | 46% | 9% | 46% | `rgba(255,90,200,.4)` | `pulse` 3s ease-in-out infinite |
| Forge | 89% | 56% | 9% | 24% | `rgba(255,150,50,.45)` | `flick` 1.6s `steps(4)` |

```css
@keyframes flick { 0%{opacity:.55} 25%{opacity:.8} 50%{opacity:.6} 75%{opacity:.9} 100%{opacity:.55} }
@keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
```
`steps()` volontaire : le scintillement doit « sauter » comme une animation pixel, pas glisser.

### 4.5 Parallaxe souris
`mx, my ∈ [-1, 1]` = position du curseur relative au centre de la scène.
Site : `transform: translate3d(mx*-10px, my*-6px, 0)` sur l'image, `transition: transform .35s cubic-bezier(.2,.7,.2,1)`. Addon : amplitude réduite (−6px / −4px). Retour à 0 au `mouseleave`.

### 4.6 Accessibilité
`@media (prefers-reduced-motion: reduce)` : couper flick, pulse, sway, bob, tumble et la parallaxe. `alt` explicite sur l'image ; chaque hotspot est un lien/bouton nommé (le texte de la plaque).

---

## 5. Site web

### 5.1 Desktop (référence 1440 px) — `captures/site.jpg`
1. **Header** 72px, fond `#1A0F0A`, séparateur bas `box-shadow 0 3px 0 #0D0912, 0 6px 0 #5B3A1C`. Gauche : emblème 36px (liseré améthyste 2px) + « VXV » Pixelify 24px 700. Puis menu `.navlink` (Pixelify 600 17px `#E9DCC0`, hover `#F2C94C`). Droite : `.pxbtn` « Connexion Discord ».
2. **Scène** pleine largeur (max 1920px, centrée), §4.
3. **Trois cartes** sous la scène (`.pxbox` : `#1A1222` + anneaux `#0D0912 / #5B3A1C / #0D0912`) : Prochain raid (CTA « Choisir mes SR » violet), Quête de la semaine (CTA or « Voir le tableau »), Le Dé Pipé (CTA « Entrer »). Kicker Pixelify sakura 15px, titre Pixelify 30px.
- `≤ 860px` : menu caché → burger ; la scène devient scrollable horizontalement (`min-width: 900px`).

### 5.2 Mobile (390 px) — `captures/mobile.jpg`
- Header 64px : emblème + VXV + **burger** 48×48 (bois, anneau cuivre ; icône 3 barres `#F8E7C0` → croix pixel or quand ouvert).
- **Bandeau taverne** 196px de haut, l'image à 463×196, scroll horizontal, étiquette « Glisse pour explorer → ».
- Carte « Prochain raid » + bouton « Mes SR ».
- **Grille 2×3 de tuiles** (hauteur 118px) : fond = la taverne en `background-size: 1100px auto` recadrée sur le lieu ; libellé en bas sur dégradé sombre (Pixelify 16px + `<small>` Manrope 11px).

| Tuile | background-position |
|---|---|
| Raid | -560px -300px |
| Quêtes | -175px -125px |
| Le Dé Pipé | -790px -230px |
| Ranking | -370px -130px |
| Artisans | -935px -300px |
| Journal | -10px -220px |

- Menu burger : panneau plein écran sous le header, fond `#24160D`, entrées Pixelify 22px séparées par `2px dashed #5B3A1C`, sous-titre à droite ; bouton « Connexion Discord » en bas.

---

## 6. Addon — structure commune

- Fenêtre **1000 × 680** (référence ; redimensionnable proportionnellement), cadre principal §3 (4 anneaux inset).
- **Barre d'en-tête** : emblème 30px rond (liseré améthyste 1px) + « VXV » Pixelify 800 16px letter-spacing .14em, puis les 7 onglets (gap 2px). Sous la barre : filet 1px `linear-gradient(90deg, transparent, #A35CFF 20%, #E0479E 80%, transparent)`.
- **Fond de chaque écran** : la taverne, cadrée sur le lieu de l'écran, très assombrie :
  `background: url(taverne) <pos> / 250% auto no-repeat; opacity: .3` puis voile `linear-gradient(180deg, rgba(14,10,22,.55), rgba(14,10,22,.9))`.

| Écran | background-position | opacity |
|---|---|---|
| Raid | 60% 85% (260%) | .30 |
| Le Dé Pipé / Deathroll | 80% 75% | .32 / .20 |
| Quêtes | 22% 45% | .30 |
| Ranking | 41% 60% | .30 |
| Artisans | 100% 80% | .34 (+ halo braise animé en bas à droite) |
| Journal | 0% 70% | .30 |

- Sous l'en-tête : kicker + titre (§2.5), éventuel sous-menu, badges d'état à droite. Puis une **grille de panneaux** (padding latéral 22px, gap 16px).
- Dans WoW : textures en `.tga`/`.blp`, filtrage **NEAREST** (`texture:SetTexture(path, nil, nil, "NEAREST")`) pour garder le pixel net ; les anneaux de box-shadow se font avec des textures 1 px (`SetColorTexture`) empilées ou un `BackdropTemplate` dont l'edge est une texture pixel 3 couleurs. La taverne (1589×672) doit être posée dans une texture **2048×1024** puis recadrée avec `SetTexCoord(0, 1589/2048, 0, 672/1024)`.

---

## 7. Addon — écran par écran

### 7.0 Taverne (accueil) — `captures/taverne.jpg`
- Scène §4 en haut (hauteur 413px dans la fenêtre 1000×680), hotspots = `Button` sans texture, plaques = `Frame` bois + `FontString`.
- **Badges** sur les plaques : Quêtes « 1 », Raid « ! », Le Dé Pipé « 2 » (nombre d'éléments en attente pour le joueur).
- En dessous : 3 cartes résumé (Raid, Quête en cours, Le Dé Pipé) + pied de fenêtre (« Survole un lieu… » / « Données à jour · il y a 12 min »).
- Parallaxe : `OnUpdate` → `GetCursorPosition()` / `UIParent:GetEffectiveScale()`, normaliser sur la scène, décaler l'ancre de la texture.
- Lueurs : textures radiales en `SetBlendMode("ADD")` + `AnimationGroup` d'animations `Alpha` (4 paliers pour reproduire `steps(4)`).

### 7.1 Raid — `captures/raid.jpg`
Kicker « CONSEIL DE GUERRE · PROCHAIN RAID », titre = nom du raid, date à côté, badges « 37 / 40 inscrits » (vert) et « SR verrouillées dans … » (or).
Grille 3 colonnes `270px | 1fr | 300px` :
- **Gauche** : panneau *Mon inscription* (avatar 44px cadre couleur de classe, nom, classe·rôle·main, bouton bois « Changer » ; 4 boutons statut en grille 2×2 — sélectionné = fond plein de sa couleur et texte `#120A1C` ; `.pxbtn` « Rejoindre le raid » ; note). Dessous, panneau **Officier** liseré or (« Créer le raid », « Inviter tout le roster (31) », demandes en attente).
- **Centre** : *Composition* — un bloc par rôle (icône rôle, libellé Pixelify, compteur `x / y`, barre 4px colorée — tanks vert, soigneurs or, DPS améthyste —, noms en couleur de classe ; retardataires à 55 % d'opacité). En bas, encart *Prochain boss* (fond `linear-gradient(90deg, rgba(224,71,158,.16), rgba(163,92,255,.08))`, liseré sakura).
- **Droite** : *Mes SR* (icône objet, nom en violet épique `#C58BFF`, boss, pastille SR+ : or `#F2C94C` si > 0 sinon `#2A2238`), note SR+. *Derniers loots* : nom, gagnant en couleur de classe, tag mode (SR violet, SR+ or plein, ROLL vert, COUNCIL sakura).
- Emplacements d'icônes de jeu (rôle/classe/objet) = carrés 30px, `1px dashed #5A4A7A` + anneau améthyste 1px dans la maquette → remplacer par les vraies icônes du jeu cerclées d'un liseré améthyste 1px.

### 7.2 Le Dé Pipé (paris) — `captures/paris.jpg`
Kicker « LA SALLE DE JEU » sakura néon, titre « Le Dé Pipé », **sous-menu** `Paris | Deathroll` (même style que les onglets, 32px). Badges « Dette : aucune » (vert) / « 10 % pour la caisse » (or).
Grille `1.2fr | 1fr` :
- **Table de jeu (feutre)** : `radial-gradient(120% 90% at 50% 0%, #3B1C5E, #24123B 55%, #170C27)` + anneaux `#0D0912 / #5B3A1C` + filet intérieur or 35 %. Pari en cours : 3 choix cliquables (pièce d'or carrée 52px avec la cote en Pixelify, biseau or), sélection = liseré or plein ; boutons de mise 10/50/100/500 po (sélection = fond or) ; « Gain possible » calculé ; `.pxbtn` « Miser X po sur « choix » ». Autres paris en lignes avec boutons `Oui × 1,6 / Non × 2,4` (bois, texte or).
- **Droite** : *Deathroll en direct* (panneau liseré `#B0306E`, point rouge clignotant `steps(2)`, VS, barre de plage dégradé `#A35CFF → #FF3B5C`, bouton « Regarder la partie »), *Défis en attente* (Accepter = `.pxbtn` petit), *Mes paris* (résumé saison).

### 7.3 Deathroll — `captures/deathroll.jpg`
- Même en-tête + sous-menu (Deathroll actif), badges « Mise 500 po » / « 14 spectateurs ».
- **Fond dynamique** : `rgb(mix(26→104), mix(14→12), mix(46→28))` avec `k = 1 − ln(max(1, plage)) / ln(1000)` (violet nuit → rouge sang), transition .8s. **Pas de jauge** : c'est le fond qui raconte la tension.
- **Joueurs** (colonnes 230px de part et d'autre) : cadre carré 132px (anneaux `#0D0912 / #8A5A2A / #0D0912`, fond couleur de classe) contenant l'**avatar** 118px (`image-rendering: pixelated`) ; nom sur **plaque bois** en couleur de classe ; titres VXV (`◆ …` `#FF8CC8`) ; rôle. Joueur dont c'est le tour : animation `turn` 1.2s `steps(2)` (anneau cuivre ↔ or + halo). Perdant : grayscale + tampon rouge incliné « A goûté le sol ». Gagnant : « VICTOIRE » or + gain vert.
- **Centre** : le **d20** (`assets/d20.png`, 150px de large) — au repos `bob` 2.4s `steps(6)` (±8px), pendant le tirage `tumble` .5s `steps(8)` (rotation 0→360° + petits sauts), à la défaite filtre rouge (`hue-rotate(80deg) saturate(1.5)` + `rotate(-8deg)`, en attendant le sprite « face crâne »). Halo `drop-shadow(0 0 18px rgba(163,92,255,.6))`.
- Gros chiffre Pixelify 100px, ombre `4px 4px 0 #0D0912` ; passe en rosé quand k > .7, rouge `#FF4D6D` à la défaite. Le défilement ralentit (délais 55→260 ms) puis s'arrête sur le résultat serveur.
- Bouton or « Roll 0 – X » (**on perd à 0**), historique des rolls en puces bois sous le chiffre, bandeau bas (cagnotte spectateurs, rappel « 0 = défaite »).

### 7.4 Quêtes — `captures/quetes.jpg`
Kicker vert « LE TABLEAU DES QUÊTES ». Grille `1.25fr | 1fr | 230px` :
- **Parchemin principal** (fond parchemin, anneaux `#0D0912 / #8A5A2A`, punaise pixel violette 12px centrée en haut) : kicker violet « QUÊTE DE LA SEMAINE · type », titre Pixelify 26px, **tampon VXV** en haut à droite, description, 3 cases récompense (70 / 20 / 10 %), top 5 avec barres violettes (ta ligne surlignée violet 14 %), encart « Ta progression », pied pointillé.
- **Tampon VXV** : cercle 72px, `border 3px solid #6A22C8`, double cercle (`inset 0 0 0 3px parchemin, inset 0 0 0 5px #6A22C8`), texte « ★ GUILDE ★ / VXV / APPROUVÉ », `rotate(-14deg)`, `opacity .82`, `mix-blend-mode: multiply`, masque radial pour l'encre irrégulière. Dans WoW : une texture PNG pré-rendue (plus simple).
- **Centre** : panneau « À venir » (petit parchemin), panneau « Terminées » (parchemins désaturés `saturate(.75) brightness(.9)` avec tampon rouge « ACCOMPLIE » incliné).
- **Droite** : *Hall of fame* (panneau liseré or), *Officier* (« Publier une quête »).

### 7.5 Ranking — `captures/ranking.jpg`
Kicker or « AU-DESSUS DE LA CHEMINÉE ». Sous-menu catégories (Paris, Deathroll, Quêtes, Présence, Titres) ; sélecteur de période à droite (Toujours / Mois / Saison — actif = fond or, texte sombre).
- **Podium = 3 fanions** suspendus à une barre bois (10px, embouts or 14×18) par 2 anneaux cuivre. Ordre 2–1–3. Hauteurs 300 / 330 / 280px, largeur 150px.
  - Fond = **couleur de classe pleine** + voile `linear-gradient(90deg, rgba(0,0,0,.18), rgba(255,255,255,.08) 40%, rgba(0,0,0,.15))` (effet tissu, **pas de rayures, pas de franges**).
  - Forme : `clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 90%, 0 100%)`.
  - Deux bandes verticales de métal (or/argent/bronze `#F2C94C / #D9DBE6 / #D08A5A`) à 8px des bords, 4px de large.
  - Contenu centré : « OR / ARGENT / BRONZE » (Manrope 10px 800 `#120A1C`), médaille carrée 46px métal avec le rang, **avatar 72px** (anneaux encre + métal), nom Pixelify 21px `#120A1C`, titre VXV `#5A0F3A`, gain dans un cartouche noir.
  - Balancement `sway` 5s ease-in-out ±1.2° (`transform-origin: top center`), décalé de -1.2s / 0 / -2.4s.
- Sous le podium : *Records de la saison* (3 cases).
- **Droite** : *Suite du classement* — lignes `24px | 32px | 1fr | 80px | 64px` : rang Pixelify, **avatar 32px** cadre 2px couleur de classe, nom couleur de classe + titre VXV, barre (vert gain / rouge perte), valeur Pixelify. Lignes alternées `rgba(163,92,255,.06)` / `rgba(10,6,16,.4)`. **Ta position** toujours en bas (liseré améthyste 2px, fond violet 16 %).

### 7.6 Artisans — `captures/artisans.jpg`
Kicker braise « LA FORGE · ANNUAIRE », titre « Qui peut fabriquer… ? », **barre de recherche sur parchemin** (44px, anneaux encre + cuivre, loupe pixel en `<rect>`). Halo braise animé en bas à droite (`flick` 1.8s steps(4)).
Grille `200px | 1fr | 270px` : liste des métiers (boutons pleine largeur avec compteur, sélection prune + liseré or) ; résultats (carte objet en vert « inhabituel » `#1EFF00`, tableau artisans avec statut en ligne vert / hors ligne, niveau en or, bouton « Chuchoter » bois, autres recettes rares) ; *Mes métiers* (barres dégradé braise → or) et *Astuce du forgeron* (panneau bois liseré cuivre).

### 7.7 Journal — `captures/journal.jpg`
Un **livre de comptes ouvert** : couverture cuir (`linear-gradient(180deg, #4A2414, #2E140A)`, anneaux `#0D0912 / #8A5A2A`, filet `#6B3A1E`) contenant deux pages parchemin réglées (`repeating-linear-gradient(180deg, transparent 0 31px, rgba(120,80,30,.22) 31px 32px)` + fond parchemin), ombre de reliure au centre (`inset ±24px 0 30px -18px rgba(70,40,10,.55)`).
- **Page gauche — La caisse** : solde Pixelify 40px `#8A5A0E`, entrées/sorties du mois, mouvements (date, libellé, montant vert `#2E7A44` / rouge `#8A1F2C`), `.pxbtn` « Faire un don ».
- **Page droite — Journal des officiers** (non effaçable) : filtres-puces (Tout, Loots, Caisse, Quêtes, Paris, Raid ; actif = prune), entrées avec **tampon** catégorie (bordure 1.5px couleur : LOOT `#7A2FE0`, CAISSE `#8A5A0E`, QUÊTE `#2E7A44`, PARI `#B0306E`, RAID `#3A5AA0`), date, auteur, action en gras, *Motif* en italique.

### 7.8 Mode réduit (pendant le raid) — `captures/reduit.jpg`
Fenêtre **420 × 600**, cadre 3 anneaux. En-tête compact (emblème 24px, « mode réduit », boutons Agrandir / Fermer 28px bois). Onglets courts `Raid · Paris · Quêtes · Ranking · …` (« Le Dé Pipé » devient « Paris » faute de place ; le reste dans `…`). Alerte « Tu as une SR sur le prochain boss » (fond `#2A1030`, liseré or), loot du prochain boss en cartes, pied d'état.

---

## 8. Avatars

- Portraits pixel art **par race × classe × sexe** (42 combinaisons au total, Horde + paladin MV). 9 livrés : `assets/avatars/` (`*_128.png` pour l'UI, `*.png` source détourée ~560px).
- **Format** : carré 1:1, buste serré (tête dans la moitié haute, vue 3/4), fond transparent, contour 1px `#0D0912`, une gemme améthyste sur l'équipement (signature VXV).
- **Cadre** = toujours la **couleur de classe du joueur** (même si l'avatar est emprunté) ; fond derrière l'avatar `#141828`.
- Tailles : 32px (listes), 44px (inscription), 72px (podium), 118px (deathroll). Toujours `image-rendering: pixelated` / filtre NEAREST.
- **Repli** quand l'avatar exact n'existe pas : (1) même race + classe, autre sexe → (2) même classe, autre race → (3) même race, autre classe. Le sexe/race/classe viennent de `UnitRace`, `UnitSex`, `UnitClass` (déjà connus par l'addon).
- Fichiers à nommer `race_classe_sexe.png` (ex. `orc_chaman_m.png`) ; les 9 actuels sont à renommer selon cette convention (chasseuse taurène et prêtresse MV = `_f`).

---

## 9. Le d20 VXV

- `assets/d20.png` (223×256, fond transparent) : d20 en résine violette translucide avec crâne marbré, « 20 » doré, autres chiffres gravés violet foncé.
- À venir : version **défaite** (face crâne rouge `#FF4D6D`, crâne interne rougeoyant) — même cadrage, à substituer au filtre rouge temporaire.
- Le d20 ne montre pas la plage (0–1000) : c'est le gros chiffre à côté qui l'affiche.
- Usages : deathroll (centre), éventuellement porte du Dé Pipé et favicon de la section.

---

## 10. Ce qui ne doit pas changer (checklist de revue)

- [ ] Aucun arrondi, aucune ombre floue sur les cadres ; reliefs = anneaux pleins.
- [ ] Pixel art toujours en `pixelated` / NEAREST, jamais lissé.
- [ ] Noms de joueurs = couleur de classe, partout.
- [ ] Noms de lieux = noms d'onglets (Raid, Le Dé Pipé, Quêtes, Ranking, Artisans, Journal).
- [ ] Survol = prune + or ; zones officier = liseré or.
- [ ] Animations en `steps()` (flick, bob, tumble, turn, blink) sauf parallaxe et pulse ; toutes coupées en reduced-motion.
- [ ] Deathroll : défaite à **0**, fond qui rougit, pas de jauge.
- [ ] Ranking : fanions couleur de classe, sans rayures ni franges.
- [ ] Mur des avis de recherche : aucune interaction tant que le JcJ n'existe pas.

---

## 11. Production des illustrations (pour la suite)

Outil utilisé : Nano Banana (Gemini). Méthode qui a marché :
1. Toujours joindre une **image de référence** (la taverne pour le décor ; l'orc chaman + le MV démoniste pour un avatar) et dire « ONLY as style and framing reference ».
2. Fond **vert pur `#00FF00`**, carré 1:1, « clean uniform pixel grid, crisp 1-pixel dark outline #0D0912, hard-edged shading with 3-4 tones per color, no blur ».
3. Une seule modification par passe sur une image existante (sinon le reste dérive).
4. Post-traitement : détourage du vert (flood fill depuis les bords uniquement — la peau des orcs est verte), suppression du liseré, recadrage carré, puis export 128px. Idéalement passage Aseprite / `fix_pixel_art` pour une vraie grille.
5. Calques de la taverne à produire depuis `assets/taverne.jpg` : décor seul, personnages seuls sur vert, premier plan seul sur vert — même cadrage exact.

---

## 12. Correspondance des images dans les maquettes

| `/_blob/…` dans `maquettes/*.html` | Fichier |
|---|---|
| `bca5e978c6d5b9512acd411a794baf80` | `assets/taverne.jpg` |
| `6142b31e73058fcff9810fc790873325` | `assets/d20.png` |
| `627f92c58df256da13e2ad709d9a30ad` | `assets/logo.jpg` |
| `b2d2692afb3c794bbdca84d87038ac16` | `assets/emblem.jpg` |
| `8f759db3a3a565f7fe41e5c356648b97` | `assets/avatars/orc_chaman_128.png` |
| `a49fa972bbc013029a5f8bbd0ad62315` | `assets/avatars/orc_guerrier_128.png` |
| `bff73a6368d8998c25ac31fd5fa428eb` | `assets/avatars/troll_mage_128.png` |
| `54c90808d352016a2eb4c48a4be4f0a3` | `assets/avatars/tauren_druide_128.png` |
| `f9955d4888789440c99d8bfad6ca086a` | `assets/avatars/tauren_chasseur_128.png` |
| `7f168a1738c4a7b037d7a26c3bdfa5ea` | `assets/avatars/mv_voleur_128.png` |
| `e64ba55514f8d40965beae3f09cf595c` | `assets/avatars/mv_pretre_128.png` |
| `b05e42a9d0d07e647da2e9999e8995fc` | `assets/avatars/mv_paladin_128.png` |
| `31795322e5c75ae9d4f56747935f288d` | `assets/avatars/mv_demoniste_128.png` |

Les maquettes utilisent un petit moteur de template (`{{…}}`, `<sc-for>`, `<sc-if>`, classe `DCLogic`) propre à l'outil de design : **ne pas le reprendre**, seules les valeurs CSS et la structure HTML servent de référence.
