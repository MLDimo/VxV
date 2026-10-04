local _, ns = ...

--- The single way to the Blizzard API, whose names and availability vary between clients.
--- Every wrapper follows the pcall contract: true and the results, or false and an error message
--- ("API absente" when the client has none of the candidate functions). Never a Lua error.
local Compat = {}
ns.Compat = Compat

local MISSING_API = "API absente"

--- Wrapper name -> candidate functions, tried in order. Measured on WoW Forever in phase 0, unless noted.
local ALIASES = {
    -- Names and classes
    GetUnitName = { "GetUnitName" },
    UnitClass = { "UnitClass" }, -- not measured yet
    -- Guild
    GetGuildInfo = { "GetGuildInfo" }, -- not measured yet
    RequestGuildRoster = { "C_GuildInfo.GuildRoster", "GuildRoster" },
    GetNumGuildMembers = { "GetNumGuildMembers" },
    GetGuildRosterInfo = { "GetGuildRosterInfo" },
    -- Addon communication
    RegisterAddonMessagePrefix = { "C_ChatInfo.RegisterAddonMessagePrefix", "RegisterAddonMessagePrefix" },
    SendAddonMessage = { "C_ChatInfo.SendAddonMessage", "SendAddonMessage" },
    InChatMessagingLockdown = { "C_ChatInfo.InChatMessagingLockdown" },
    -- Loot
    GetLootMethod = { "C_PartyInfo.GetLootMethod", "GetLootMethod" },
    IsMasterLooter = { "IsMasterLooter" },
    GetMasterLootCandidate = { "GetMasterLootCandidate" },
    GiveMasterLoot = { "GiveMasterLoot" },
    GetSortedInfoForDrop = { "C_LootHistory.GetSortedInfoForDrop" },
    -- Interface
    GetCursorPosition = { "GetCursorPosition" }, -- not measured yet
    GetMinimapShape = { "GetMinimapShape" }, -- optional: defined by minimap addons only
}

--- The value at a dotted path of the global table ("C_ChatInfo.SendAddonMessage"), or nil.
--- The way to interface objects phase 0 did not measure (Minimap, GameTooltip…): absent means nil, not an error.
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
        if fn == nil then
            return false, MISSING_API
        end
        return pcall(fn, ...)
    end
end
