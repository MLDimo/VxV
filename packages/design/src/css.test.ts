import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fontFile, renderCss, renderPlainCss } from "./css.ts";
import { LUA_TOKENS } from "./files.ts";
import { renderLua } from "./lua.ts";
import { FONTS } from "./tokens.ts";

const FONT_FILES = new URL("../../../apps/web/public/fonts/", import.meta.url);

describe("generated styles", () => {
  it("are up to date with the tokens (npm run generate)", () => {
    expect(readFileSync(new URL("tokens.css", import.meta.url), "utf8")).toBe(renderCss());
  });

  it("give the addon the same tokens (npm run generate)", () => {
    expect(readFileSync(LUA_TOKENS, "utf8")).toBe(renderLua());
  });

  it("only use font files the website serves", () => {
    const served = new Set(readdirSync(FONT_FILES));
    const needed = Object.values(FONTS).flatMap((font) => font.weights.map((weight) => fontFile(font.file, weight)));
    expect(needed.filter((file) => !served.has(file))).toEqual([]);
  });

  it("take rounded corners out of the theme", () => {
    expect(renderCss()).toContain("--radius-*: initial;");
  });

  it("exist as plain CSS for a page without Tailwind, with its own font files", () => {
    const css = renderPlainCss("fonts");
    expect(css).toContain('src: url("fonts/pixelify-sans-latin-600-normal.woff2")');
    expect(css).toContain(":root {\n  --font-pixel:");
    expect(css).toContain("  --color-amethyst: #a35cff;");
  });
});
