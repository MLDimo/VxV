local _, ns = ...

--- Single access point to Blizzard APIs whose name or presence varies between clients.
--- Every wrapper returns the pcall contract: ok, ...results (or false, error message).
local Compat = {}
ns.Compat = Compat

-- Wrapper name -> candidate global paths, tried in order.
local ALIASES = {
    RegisterAddonMessagePrefix = { "C_ChatInfo.RegisterAddonMessagePrefix", "RegisterAddonMessagePrefix" },
    SendAddonMessage = { "C_ChatInfo.SendAddonMessage", "SendAddonMessage" },
    InChatMessagingLockdown = { "C_ChatInfo.InChatMessagingLockdown" },
    GetLootMethod = { "C_PartyInfo.GetLootMethod", "GetLootMethod" },
    GetMasterLootCandidate = { "GetMasterLootCandidate" },
    GetSortedInfoForDrop = { "C_LootHistory.GetSortedInfoForDrop" },
    IsEncounterInProgress = { "C_InstanceEncounter.IsEncounterInProgress", "IsEncounterInProgress" },
    RequestGuildRoster = { "C_GuildInfo.GuildRoster", "GuildRoster" },
    GetUnitName = { "GetUnitName" },
    GetRealmName = { "GetRealmName" },
    GetNormalizedRealmName = { "GetNormalizedRealmName" },
    -- Phase 0 complements (T1 to T10)
    InviteUnit = { "C_PartyInfo.InviteUnit", "InviteUnit" },
    ConvertToRaid = { "C_PartyInfo.ConvertToRaid", "ConvertToRaid" },
    IsMasterLooter = { "IsMasterLooter" },
    SendChatMessage = { "C_ChatInfo.SendChatMessage", "SendChatMessage" },
    RandomRoll = { "RandomRoll" },
    GetStatisticsCategoryList = { "GetStatisticsCategoryList" },
    GetCategoryNumAchievements = { "GetCategoryNumAchievements" },
    GetAchievementInfo = { "GetAchievementInfo" },
    GetStatistic = { "GetStatistic" },
    GetPVPLifetimeStats = { "GetPVPLifetimeStats" },
    AddTooltipPostCall = { "TooltipDataProcessor.AddTooltipPostCall" },
    AddMessageEventFilter = { "ChatFrameUtil.AddMessageEventFilter", "ChatFrame_AddMessageEventFilter" },
    IsAddOnLoaded = { "C_AddOns.IsAddOnLoaded", "IsAddOnLoaded" },
    GetProfessions = { "GetProfessions" },
    GetProfessionInfo = { "GetProfessionInfo" },
    GetNumSkillLines = { "GetNumSkillLines" },
    GetSkillLineInfo = { "GetSkillLineInfo" },
    GetBaseProfessionInfo = { "C_TradeSkillUI.GetBaseProfessionInfo" },
    GetAllRecipeIDs = { "C_TradeSkillUI.GetAllRecipeIDs" },
    GetRecipeInfo = { "C_TradeSkillUI.GetRecipeInfo" },
    GetNumTradeSkills = { "GetNumTradeSkills" },
    GetTradeSkillLine = { "GetTradeSkillLine" },
    GetTradeSkillInfo = { "GetTradeSkillInfo" },
    -- T11: the logs the game writes while it runs, and a private chat channel.
    LoggingCombat = { "LoggingCombat" },
    LoggingChat = { "LoggingChat" },
    GetCVar = { "C_CVar.GetCVar", "GetCVar" },
    SetCVar = { "C_CVar.SetCVar", "SetCVar" },
    JoinChannelByName = { "JoinChannelByName" },
    LeaveChannelByName = { "LeaveChannelByName" },
    GetChannelName = { "GetChannelName" },
}

local MISSING_API = "API absente"

--- Resolves a dotted global path ("C_ChatInfo.SendAddonMessage") to its value, or nil.
function Compat.Resolve(path)
    local value = _G
    for key in path:gmatch("[^%.]+") do
        if type(value) ~= "table" then
            return nil
        end
        value = value[key]
    end
    return value
end

local function firstFunction(paths)
    for _, path in ipairs(paths) do
        local candidate = Compat.Resolve(path)
        if type(candidate) == "function" then
            return candidate
        end
    end
end

for name, paths in pairs(ALIASES) do
    Compat[name] = function(...)
        local fn = firstFunction(paths)
        if not fn then
            return false, MISSING_API
        end
        return pcall(fn, ...)
    end
end
