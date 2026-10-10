import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { AVATARS } from "./avatars.ts";
import { renderCss } from "./css.ts";
import { ADDON_AVATARS, LUA_TOKENS, SITE_AVATARS } from "./files.ts";
import { renderLua } from "./lua.ts";

/** Writes the files generated from the tokens, and gives the addon the website's portraits (the Ranking). */
await writeFile(new URL("tokens.css", import.meta.url), renderCss(), "utf8");
await writeFile(LUA_TOKENS, renderLua(), "utf8");
await mkdir(ADDON_AVATARS, { recursive: true });
for (const avatar of AVATARS) {
  await copyFile(new URL(`${avatar}.png`, SITE_AVATARS), new URL(`${avatar}.png`, ADDON_AVATARS));
}
console.log("packages/design/src/tokens.css, addon/VXV/Core/UI/Tokens.lua, addon/VXV/Core/Media/Avatars");
