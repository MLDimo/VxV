import { writeFile } from "node:fs/promises";
import { renderCss } from "./css.ts";
import { renderLua } from "./lua.ts";

/** Where the addon's generated tokens go. */
export const LUA_TOKENS = new URL("../../../addon/VXV_Core/UI/Tokens.lua", import.meta.url);

/** Writes the files generated from the tokens. */
await writeFile(new URL("tokens.css", import.meta.url), renderCss(), "utf8");
await writeFile(LUA_TOKENS, renderLua(), "utf8");
console.log("packages/design/src/tokens.css, addon/VXV_Core/UI/Tokens.lua");
