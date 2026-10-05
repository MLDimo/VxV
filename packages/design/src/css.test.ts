import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderCss } from "./css.ts";
import { renderLua } from "./lua.ts";
import { FONTS } from "./tokens.ts";

const FONT_FILES = new URL("../../../apps/web/public/fonts/", import.meta.url);

describe("generated styles", () => {
  it("are up to date with the tokens (npm run generate)", () => {
    expect(readFileSync(new URL("tokens.css", import.meta.url), "utf8")).toBe(renderCss());
  });

  it("give the addon the same tokens (npm run generate)", () => {
    const tokens = new URL("../../../addon/VXV_Core/UI/Tokens.lua", import.meta.url);
    expect(readFileSync(tokens, "utf8")).toBe(renderLua());
  });

  it("only use font files the website serves", () => {
    const served = new Set(readdirSync(FONT_FILES));
    const needed = Object.values(FONTS).flatMap((font) =>
      font.weights.map((weight) => `${font.file}-latin-${String(weight)}-normal.woff2`),
    );
    expect(needed.filter((file) => !served.has(file))).toEqual([]);
  });

  it("take rounded corners out of the theme", () => {
    expect(renderCss()).toContain("--radius-*: initial;");
  });
});
