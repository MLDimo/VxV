import { CLASS_COLORS, COLORS, FONTS } from "./tokens.ts";

/** Where the website serves the font files (apps/web/public/fonts). */
const SITE_FONT_URL = "/fonts";

/** The file of one font weight, as Fontsource names it (latin subset). */
export function fontFile(file: string, weight: number): string {
  return `${file}-latin-${String(weight)}-normal.woff2`;
}

/** The @font-face rules of the charter's fonts, served from this address. */
export function fontFaces(fontUrl: string): string[] {
  return Object.values(FONTS).flatMap((font) =>
    font.weights.map((weight) =>
      [
        "@font-face {",
        `  font-family: "${font.family}";`,
        "  font-style: normal;",
        `  font-weight: ${String(weight)};`,
        "  font-display: swap;",
        `  src: url("${fontUrl}/${fontFile(font.file, weight)}") format("woff2");`,
        "}",
      ].join("\n"),
    ),
  );
}

/** The fonts and colors as CSS variables (--font-pixel, --color-amethyst, --color-class-warrior…). */
export function themeVariables(): string[] {
  return [
    `  --font-pixel: "${FONTS.pixel.family}", ${FONTS.pixel.fallback};`,
    `  --font-sans: "${FONTS.text.family}", ${FONTS.text.fallback};`,
    // Lower case, as Prettier writes CSS colors.
    ...Object.entries(COLORS).map(([name, value]) => `  --color-${name}: ${value.toLowerCase()};`),
    ...Object.entries(CLASS_COLORS).map(
      ([token, value]) => `  --color-class-${token.toLowerCase()}: ${value.toLowerCase()};`,
    ),
  ];
}

const GENERATED = "/* Generated from packages/design/src/tokens.ts by npm run generate: do not edit. */";

/**
 * The tokens as a Tailwind theme: utilities such as bg-wood, text-amethyst, font-pixel; class colors as
 * text-class-warrior. Rounded corners are taken out of the theme: the pixel art has none (§3).
 */
export function renderCss(): string {
  return [
    GENERATED,
    "",
    ...fontFaces(SITE_FONT_URL).flatMap((face) => [face, ""]),
    "@theme {",
    ...themeVariables(),
    "  --radius-*: initial;",
    "}",
    "",
  ].join("\n");
}

/** The same tokens as plain CSS, for a page without Tailwind (the companion): fonts served from fontUrl. */
export function renderPlainCss(fontUrl: string): string {
  return [...fontFaces(fontUrl).flatMap((face) => [face, ""]), ":root {", ...themeVariables(), "}", ""].join("\n");
}
