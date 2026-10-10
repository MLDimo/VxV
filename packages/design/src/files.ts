/** The files npm run generate writes, outside this package (Node only: the website's pages never import it). */

/** The addon's tokens. */
export const LUA_TOKENS = new URL("../../../addon/VXV/Core/UI/Tokens.lua", import.meta.url);
/** The portraits: the website serves them, the addon's ranking boards (its core) draw copies of them. */
export const SITE_AVATARS = new URL("../../../apps/web/public/images/avatars/", import.meta.url);
export const ADDON_AVATARS = new URL("../../../addon/VXV/Core/Media/Avatars/", import.meta.url);
