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
