import { readdirSync, readFileSync } from "node:fs";

const SESSIONS = new URL("../../../docs/phase-0/sessions/", import.meta.url);

/** Present on WoW Forever according to the probe's inventory ("/vxvtest api run", docs/phase-0/sessions). */
function inventoried(): string[] {
  return readdirSync(SESSIONS).flatMap((file) =>
    [
      ...readFileSync(new URL(file, SESSIONS), "utf8").matchAll(/\[api\] OK (\S+) (?:function|table|string|number)/g),
    ].map((match) => match[1] ?? ""),
  );
}

/** Called by the probe in game without error, beyond its inventory (docs/phase-0/sessions, 2 and 3 October). */
const USED_IN_GAME = [
  "CreateFrame",
  "UIParent",
  "UISpecialFrames",
  "SlashCmdList",
  "ChatFontNormal",
  "GetBuildInfo",
  "GetTime",
  "IsInGuild",
  "IsInGroup",
  "IsInRaid",
  "IsInInstance",
  "GetInstanceInfo",
  "InCombatLockdown",
  "GetRealmName",
  "GetNumGroupMembers",
  "UnitIsDeadOrGhost",
  "UnitIsGroupLeader",
  "UnitIsGroupAssistant",
  "UnitIsPlayer",
  "IsMasterLooter",
  "C_LootHistory.GetSortedInfoForDrop",
  "C_Timer.NewTicker",
  "C_PartyInfo.InviteUnit",
  "C_PartyInfo.ConvertToRaid",
  "C_ChatInfo.SendChatMessage",
  "RandomRoll",
  "RANDOM_ROLL_RESULT",
  "Enum",
];

/** Lua 5.1 and the extensions the WoW client adds to it. */
export const LUA_ENVIRONMENT = new Set([
  "_G",
  "assert",
  "error",
  "getmetatable",
  "ipairs",
  "next",
  "pairs",
  "pcall",
  "print",
  "rawequal",
  "rawget",
  "rawset",
  "select",
  "setmetatable",
  "tonumber",
  "tostring",
  "type",
  "unpack",
  "xpcall",
  "math",
  "string",
  "table",
  "date",
  "time",
  "strsplit",
  "wipe",
  "geterrorhandler",
]);

/** Blizzard API measured on WoW Forever: an addon may read these directly; anything else goes through Compat. */
export function foreverApi(): Set<string> {
  return new Set([...inventoried(), ...USED_IN_GAME]);
}

/** Compat wrappers whose functions phase 0 did not measure: to confirm during the in-game validation of P4. */
export const NOT_YET_MEASURED = new Set(["GetGuildInfo", "UnitClass", "GetCursorPosition"]);

/** Compat wrappers for functions that other addons define, absent from a client without them. */
export const OPTIONAL_API = new Set(["GetMinimapShape"]);
