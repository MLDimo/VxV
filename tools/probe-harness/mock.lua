-- Minimal WoW client mock: just enough API for VXV_Probe to load and run every command.
local frames = {}

function Fire(event, ...)
    for _, frame in ipairs(frames) do
        if frame.events[event] and frame.scripts.OnEvent then
            frame.scripts.OnEvent(frame, event, ...)
        end
    end
end

local KNOWN_EVENTS = {
    ADDON_LOADED = true, PLAYER_LOGIN = true, ADDON_ACTION_FORBIDDEN = true, ADDON_ACTION_BLOCKED = true,
    CHAT_MSG_ADDON = true, ENCOUNTER_START = true, ENCOUNTER_END = true, BOSS_KILL = true,
    LOOT_OPENED = true, LOOT_READY = true, CHAT_MSG_LOOT = true, GUILD_ROSTER_UPDATE = true,
    ENCOUNTER_LOOT_RECEIVED = true, LOOT_HISTORY_UPDATE_DROP = true,
}
-- Registering these fires ADDON_ACTION_FORBIDDEN synchronously, as the Forever client does.
local FORBIDDEN_EVENTS = { COMBAT_LOG_EVENT_UNFILTERED = true }

local function noop() end
local FRAME_NOOPS = {
    "SetSize", "SetPoint", "SetFrameStrata", "SetMovable", "EnableMouse", "RegisterForDrag", "StartMoving",
    "StopMovingOrSizing", "SetMultiLine", "SetAutoFocus", "SetFontObject", "SetWidth", "SetScrollChild",
    "Show", "Hide", "SetFocus", "HighlightText",
}

function CreateFrame()
    local frame = { events = {}, scripts = {} }
    function frame:RegisterEvent(event)
        if FORBIDDEN_EVENTS[event] then
            Fire("ADDON_ACTION_FORBIDDEN", "VXV_Probe", "UNKNOWN()")
            return
        end
        if not KNOWN_EVENTS[event] then
            error("Attempt to register unknown event " .. event)
        end
        self.events[event] = true
    end
    function frame:UnregisterEvent(event) self.events[event] = nil end
    function frame:SetScript(name, fn) self.scripts[name] = fn end
    function frame:SetText(text) self.text = text end
    for _, method in ipairs(FRAME_NOOPS) do frame[method] = noop end
    frames[#frames + 1] = frame
    return frame
end

UIParent, ChatFontNormal, UISpecialFrames, SlashCmdList = {}, {}, {}, {}
Enum = {
    SendAddonMessageResult = { Success = 0, AddonMessageThrottle = 3 },
    RegisterAddonMessagePrefixResult = { Success = 0 },
    LootMethod = { Freeforall = 0, Masterlooter = 2 },
}

local THROTTLE_AFTER = 20
local MAX_MESSAGE_BYTES = 255
local sentCount = 0
C_ChatInfo = {
    RegisterAddonMessagePrefix = function() return 0 end,
    SendAddonMessage = function(prefix, text, channel)
        if #text > MAX_MESSAGE_BYTES then error("message too long") end
        sentCount = sentCount + 1
        if sentCount > THROTTLE_AFTER then return 3 end
        Fire("CHAT_MSG_ADDON", prefix, text, channel, "Jean Dupont")
        return 0
    end,
}
C_PartyInfo = { GetLootMethod = function() return 2, 1, nil end, GiveMasterLootTo = function() end }
C_GuildInfo = { GuildRoster = function() Fire("GUILD_ROSTER_UPDATE") end }
C_LootHistory = {
    GetSortedInfoForDrop = function(_, lootListId)
        return {
            lootListID = lootListId,
            itemHyperlink = "[Brassards brindecieux]",
            winner = { playerName = "Eole Hermes", playerClass = "WARRIOR", roll = 87, isSelf = false },
        }
    end,
}
C_Timer = { After = function(_, fn) fn() end }

GetBuildInfo = function() return "1.60.1", "70170", "Oct 1 2026", 16001 end
IsInInstance = function() return true, "raid" end
GetInstanceInfo = function() return "Molten Core", "raid", 9, "40 joueurs", 40, 0, false, 409 end
IsInRaid = function() return true end
IsInGroup = function() return true end
IsInGuild = function() return true end
InCombatLockdown = function() return true end
LE_PARTY_CATEGORY_INSTANCE = 2
GetTime = function() return os.clock() end
time = os.time
date = os.date
issecretvalue = function(value) return value == "SECRET" end
strsplit = function(separator, text)
    local parts = {}
    for part in (text .. separator):gmatch("(.-)" .. separator) do parts[#parts + 1] = part end
    return table.unpack(parts)
end
UnitName = function() return "Jean Dupont", nil end
UnitFullName = function() return "SECRET", "Forever" end
GetUnitName = function() return "Jean Dupont-Forever" end
GetRealmName = function() return "Forever" end
GetNumGuildMembers = function() return 2, 1 end
GetGuildRosterInfo = function(index)
    return index == 1 and "Jean Dupont" or "Marie", "Officier", 1, 60, "Guerrier", "", "", "", true, 0, "WARRIOR"
end
GetNumLootItems = function() return 1 end
GetLootSlotLink = function() return "|cffa335ee|Hitem:1|h[Epee]|h|r" end
GetMasterLootCandidate = function(_, index) return index <= 2 and ("Joueur " .. index) or nil end
GiveMasterLoot = noop
hooksecurefunc = function(name, post)
    local original = _G[name]
    _G[name] = function(...) original(...); post(...) end
end
