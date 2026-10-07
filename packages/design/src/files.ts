/** The files npm run generate writes, outside this package (Node only: the website's pages never import it). */

/** The addon's tokens. */
export const LUA_TOKENS = new URL("../../../addon/VXV_Core/UI/Tokens.lua", import.meta.url);
/** The portraits: the website serves them, the addon's Ranking (VXV_Ranking) draws copies of them. */
export const SITE_AVATARS = new URL("../../../apps/web/public/images/avatars/", import.meta.url);
export const ADDON_AVATARS = new URL("../../../addon/VXV_Ranking/Media/Avatars/", import.meta.url);
