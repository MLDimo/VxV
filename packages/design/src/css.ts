import { CLASS_COLORS, COLORS, FONTS } from "./tokens.ts";

/** Where the website serves the font files (apps/web/public/fonts). */
const FONT_URL = "/fonts";

function fontFaces(): string[] {
  return Object.values(FONTS).flatMap((font) =>
    font.weights.map((weight) =>
      [
        "@font-face {",
        `  font-family: "${font.family}";`,
        "  font-style: normal;",
        `  font-weight: ${String(weight)};`,
        "  font-display: swap;",
        `  src: url("${FONT_URL}/${font.file}-latin-${String(weight)}-normal.woff2") format("woff2");`,
        "}",
      ].join("\n"),
    ),
  );
}

/**
 * The tokens as a Tailwind theme: utilities such as bg-wood, text-amethyst, font-pixel; class colors as
 * text-class-warrior. Rounded corners are taken out of the theme: the pixel art has none (§3).
 */
export function renderCss(): string {
  const variables = [
    `  --font-pixel: "${FONTS.pixel.family}", ${FONTS.pixel.fallback};`,
    `  --font-sans: "${FONTS.text.family}", ${FONTS.text.fallback};`,
    // Lower case, as Prettier writes CSS colors.
    ...Object.entries(COLORS).map(([name, value]) => `  --color-${name}: ${value.toLowerCase()};`),
    ...Object.entries(CLASS_COLORS).map(
      ([token, value]) => `  --color-class-${token.toLowerCase()}: ${value.toLowerCase()};`,
    ),
    "  --radius-*: initial;",
  ];
  return [
    "/* Generated from packages/design/src/tokens.ts by npm run generate: do not edit. */",
    "",
    ...fontFaces().flatMap((face) => [face, ""]),
    "@theme {",
    ...variables,
    "}",
    "",
  ].join("\n");
}
