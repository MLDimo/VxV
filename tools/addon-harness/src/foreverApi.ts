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

/**
 * Called in game without error, beyond the probe's inventory: by the probe (docs/phase-0/sessions, 2 and 3 October)
 * and by VXV_Core during the in-game validation of P4 (4 October).
 */
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
  "GetGuildInfo",
  "GetCursorPosition",
  // Design measurement, 5 October (docs/design/mesure-en-jeu-2026-10-05.md).
  "CreateFontFamily",
  "GameFontNormal",
  "UnitRace",
  "UnitSex",
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

/** Compat wrappers for functions that other addons define, absent from a client without them. */
export const OPTIONAL_API = new Set(["GetMinimapShape", "PlaySound"]);
