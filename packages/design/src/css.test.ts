import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderCss } from "./css.ts";
import { FONTS } from "./tokens.ts";

const FONT_FILES = new URL("../../../apps/web/public/fonts/", import.meta.url);

describe("generated styles", () => {
  it("are up to date with the tokens (npm run generate)", () => {
    expect(readFileSync(new URL("tokens.css", import.meta.url), "utf8")).toBe(renderCss());
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
