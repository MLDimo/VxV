-- Minimal WoW client mock: just enough API for VXV_Probe to load and run every command.
-- Chat output is silenced unless VXV_VERBOSE=1, to keep test logs readable.
if os.getenv("VXV_VERBOSE") ~= "1" then
    print = function() end
end

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
    PARTY_INVITE_REQUEST = true, GROUP_ROSTER_UPDATE = true, CHAT_MSG_SYSTEM = true, UI_ERROR_MESSAGE = true,
    CHAT_MSG_RAID = true, CHAT_MSG_RAID_LEADER = true, CHAT_MSG_RAID_WARNING = true, CHAT_MSG_PARTY = true,
    CHAT_MSG_PARTY_LEADER = true, CHAT_MSG_GUILD = true, PLAYER_DEAD = true, PLAYER_ALIVE = true,
    PLAYER_UNGHOST = true, RESURRECT_REQUEST = true, TRADE_SKILL_SHOW = true,
}
-- Registering these fires ADDON_ACTION_FORBIDDEN synchronously, as the Forever client does.
local FORBIDDEN_EVENTS = { COMBAT_LOG_EVENT_UNFILTERED = true }

local function noop() end
local FRAME_NOOPS = {
    "SetSize", "SetPoint", "SetFrameStrata", "SetMovable", "EnableMouse", "RegisterForDrag", "StartMoving",
    "StopMovingOrSizing", "SetMultiLine", "SetAutoFocus", "SetFontObject", "SetWidth", "SetScrollChild",
    "SetFocus", "HighlightText",
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
    function frame:SetShown(shown) self.shown = shown end
    function frame:Show() self.shown = true end
    function frame:Hide() self.shown = false end
    function frame:IsShown() return self.shown end
    for _, method in ipairs(FRAME_NOOPS) do frame[method] = noop end
    frames[#frames + 1] = frame
    return frame
end

UIParent, ChatFontNormal, UISpecialFrames, SlashCmdList = {}, {}, {}, {}
Enum = {
    SendAddonMessageResult = { Success = 0, AddonMessageThrottle = 3 },
    RegisterAddonMessagePrefixResult = { Success = 0 },
    LootMethod = { Freeforall = 0, Masterlooter = 2 },
    DamageMeterType = { DamageDone = 0, HealingDone = 2 },
    DamageMeterSessionType = { Overall = 0, Current = 1 },
    TooltipDataType = { Unit = 2 },
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
    SendChatMessage = function(text, channel) Fire("CHAT_MSG_" .. channel, text, "Jean Dupont") end,
}
C_PartyInfo = { GetLootMethod = function() return 2, 1, nil end, InviteUnit = noop, ConvertToRaid = noop }
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
-- Timers fire at once; tickers fire on Tick(), called by the scenario.
local tickers = {}
C_Timer = {
    After = function(_, fn) fn() end,
    NewTicker = function(_, fn)
        local ticker = { fn = fn }
        function ticker:Cancel() tickers[self] = nil end
        tickers[ticker] = true
        return ticker
    end,
}
function Tick()
    for ticker in pairs(tickers) do ticker.fn() end
end

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
IsMasterLooter = function() return true end
hooksecurefunc = function(target, name, post)
    if type(target) == "string" then
        target, name, post = _G, target, name
    end
    local original = target[name]
    target[name] = function(...) original(...); post(...) end
end

-- Group, rolls, deaths (T1, T3, T5, T6). The scenario changes DeadUnits to simulate deaths.
DeadUnits = {}
GetNumGroupMembers = function() return 2 end
UnitIsGroupLeader = function() return true end
UnitIsGroupAssistant = function() return false end
UnitIsPlayer = function() return true end
UnitIsDeadOrGhost = function(unit) return DeadUnits[unit] or false end
RANDOM_ROLL_RESULT = "%s obtient un %d (%d-%d)."
RandomRoll = function(low, high) Fire("CHAT_MSG_SYSTEM", RANDOM_ROLL_RESULT:format("Jean Dupont", 42, low, high)) end

-- Counters (T8). The scenario changes StatisticValues to simulate a kill.
StatisticValues = { [1197] = 10, [1198] = 4 }
GetStatisticsCategoryList = function() return { 130 } end
GetCategoryNumAchievements = function() return 2 end
GetAchievementInfo = function(_, index)
    return 1196 + index, index == 1 and "Créatures tuées" or "Victoires donnant de l'expérience"
end
GetStatistic = function(id) return tostring(StatisticValues[id]) end
GetPVPLifetimeStats = function() return 3 end

-- Damage meter (T7)
C_DamageMeter = {
    IsDamageMeterAvailable = function() return true end,
    GetAvailableCombatSessions = function() return { { sessionID = 1, name = "Combat" } } end,
    GetCombatSessionFromType = function()
        return { totalAmount = 1000, combatSources = { { name = "Jean Dupont", totalAmount = 600 } } }
    end,
}

-- Display (T9): hooks run at once on a fake tooltip and on a normal then a secret guild message.
local fakeTooltip = { GetUnit = function() return "Jean Dupont", "target" end, AddLine = noop }
TooltipDataProcessor = { AddTooltipPostCall = function(_, fn) fn(fakeTooltip) end }
ChatFrameUtil = {
    AddMessageEventFilter = function(event, filter)
        filter({}, event, "bonjour", "Jean Dupont")
        filter({}, event, "SECRET", "Jean Dupont")
    end,
}
C_AddOns = { IsAddOnLoaded = function() return false, false end }
CommunitiesMemberListEntryMixin = { SetMember = noop }
CommunitiesFrame = false -- the scenario sets it to simulate the modern guild window
FakeRosterEntry = { NameFrame = { Name = { GetText = function() return "Jean Dupont" end, SetText = noop } } }
-- Rows filled by the list, passed after the owner as on Forever: one with a name, one of unknown structure,
-- then an existing row passed alone, and a value that is not a row.
ScrollUtil = {
    AddInitializedFrameCallback = function(_, callback, owner)
        callback(owner, FakeRosterEntry)
        callback(owner, { Unknown = true })
        callback(FakeRosterEntry)
        callback(owner, nil)
    end,
}

-- Professions (T10): modern API; the scenario removes it to run the classic one.
GetProfessions = function() return 1, nil, nil, 4, 5 end
GetProfessionInfo = function(index) return "Métier " .. index, "icon", 150, 300, 10, 0, 164 end
GetNumSkillLines = function() return 2 end
GetSkillLineInfo = function(index)
    if index == 1 then return "Métiers", true end
    return "Forge", false, false, 150, 0, 0, 300
end
C_TradeSkillUI = {
    GetAllRecipeIDs = function() return { 1, 2 } end,
    GetRecipeInfo = function(id) return { name = "Recette " .. id, learned = id == 1 } end,
    GetBaseProfessionInfo = function() return { professionName = "Forge" } end,
}
GetNumTradeSkills = function() return 3 end
GetTradeSkillInfo = function(index)
    if index == 1 then return "Armes", "header" end
    return "Recette " .. index, "optimal"
end
GetTradeSkillLine = function() return "Forge", 150, 300 end

-- Must stay last: every global created from here on comes from the addon or the scenario.
local mockGlobals = {}
function NewGlobals()
    local names = {}
    for name in pairs(_G) do
        if not mockGlobals[name] then
            names[#names + 1] = name
        end
    end
    return table.concat(names, " ")
end
for name in pairs(_G) do
    mockGlobals[name] = true
end
