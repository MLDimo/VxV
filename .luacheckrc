-- Lua lint configuration for every addon bundle (WoW runs Lua 5.1).
std = "lua51"
max_line_length = 120
exclude_files = { "**/External/*.lua" }

-- Globals each addon is allowed to define.
globals = {
    "VXV_ProbeDB",
    "VXV_ProbeInbox",
    "VXV_RaidData",
    "SLASH_VXVPROBE1",
    "SlashCmdList",
    "UISpecialFrames",
}

-- WoW client API used in read-only mode.
read_globals = {
    "C_ChatInfo", "C_DamageMeter", "C_GuildInfo", "C_PartyInfo", "C_Timer", "ChatFontNormal", "CommunitiesFrame",
    "CommunitiesMemberListEntryMixin", "CreateFrame", "Enum", "GameTooltip", "GetBuildInfo", "GetGuildRosterInfo",
    "GetInstanceInfo", "GetLootSlotLink", "GetNumGroupMembers", "GetNumGuildMembers", "GetNumLootItems", "GetTime",
    "GiveMasterLoot", "InCombatLockdown", "IsInGroup", "IsInGuild", "IsInInstance", "IsInRaid",
    "LE_PARTY_CATEGORY_INSTANCE", "RANDOM_ROLL_RESULT", "ScrollUtil", "UIParent", "UnitFullName",
    "UnitIsDeadOrGhost", "UnitIsGroupAssistant", "UnitIsGroupLeader", "UnitIsPlayer", "UnitName",
    "date", "hooksecurefunc", "issecretvalue", "strsplit", "time",
}
