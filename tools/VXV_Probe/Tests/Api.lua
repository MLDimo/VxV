local _, ns = ...

--- Inventory of the functions and events every later phase relies on.
local Util = ns.Util
local log = ns.Log.For("api")

local FUNCTIONS = {
    -- Addon communication (0.3)
    "C_ChatInfo.RegisterAddonMessagePrefix", "C_ChatInfo.SendAddonMessage", "C_ChatInfo.SendAddonMessageLogged",
    "C_ChatInfo.InChatMessagingLockdown", "SendAddonMessage",
    -- Boss and loot (0.4)
    "C_PartyInfo.GetLootMethod", "GetLootMethod", "GetMasterLootCandidate", "GiveMasterLoot",
    "GetNumLootItems", "GetLootSlotLink", "C_LootHistory", "C_InstanceEncounter.IsEncounterInProgress",
    "IsEncounterInProgress", "C_Item.GetItemInfo", "C_EncounterJournal",
    -- Names and guild roster (0.5)
    "UnitName", "UnitFullName", "GetUnitName", "Ambiguate", "issecretvalue",
    "C_GuildInfo.GuildRoster", "GetNumGuildMembers", "GetGuildRosterInfo", "C_Club",
    -- Misc
    "C_Timer.After", "hooksecurefunc",
}

local EVENTS = {
    "CHAT_MSG_ADDON",
    "ENCOUNTER_START", "ENCOUNTER_END", "BOSS_KILL",
    "LOOT_READY", "LOOT_OPENED", "LOOT_SLOT_CLEARED", "LOOT_CLOSED", "OPEN_MASTER_LOOT_LIST",
    "CHAT_MSG_LOOT", "START_LOOT_ROLL", "ENCOUNTER_LOOT_RECEIVED",
    "LOOT_HISTORY_UPDATE_DROP", "LOOT_HISTORY_UPDATE_ENCOUNTER", "PARTY_LOOT_METHOD_CHANGED",
    "GUILD_ROSTER_UPDATE", "COMBAT_LOG_EVENT_UNFILTERED",
}

local function checkBuild()
    local version, build, buildDate, interface = GetBuildInfo()
    log.Info("client", version, "build", build, buildDate, "interface", interface)
end

local function checkFunctions()
    for _, path in ipairs(FUNCTIONS) do
        local value = ns.Compat.Resolve(path)
        log.Check(value ~= nil, path, value ~= nil and type(value) or "absente")
    end
end

local function checkEvents()
    for _, event in ipairs(EVENTS) do
        local known = ns.Events.IsKnown(event)
        log.Check(known, "événement", event, known and "accepté" or "refusé")
    end
end

local function matches(name, pattern)
    return type(name) == "string" and name:lower():find(pattern, 1, true) ~= nil
end

--- Lists every global and every C_* namespace member whose name contains the pattern.
local function find(args)
    local pattern = args:lower()
    if pattern == "" then
        log.Fail("usage : /vxvtest api find <motif>")
        return
    end
    local results = {}
    for name, value in pairs(_G) do
        if matches(name, pattern) then
            results[#results + 1] = name .. " (" .. type(value) .. ")"
        end
        if type(name) == "string" and name:match("^C_") and type(value) == "table" and not Util.IsSecret(value) then
            for member, memberValue in pairs(value) do
                if matches(member, pattern) then
                    results[#results + 1] = name .. "." .. member .. " (" .. type(memberValue) .. ")"
                end
            end
        end
    end
    table.sort(results)
    log.Info("recherche « " .. pattern .. " » :", #results, "résultat(s), détail dans le rapport")
    for _, result in ipairs(results) do
        log.Trace("trouvé", result)
    end
end

ns.Registry.Register({
    id = "api",
    description = "inventaire des fonctions et événements disponibles",
    commands = {
        {
            name = "run",
            run = function()
                checkBuild()
                checkFunctions()
                checkEvents()
            end,
        },
        { name = "find", usage = "<motif>", run = find },
    },
})
