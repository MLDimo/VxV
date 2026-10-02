local _, ns = ...

--- Step 0.4: boss detection, loot method, master loot and item attribution events.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("loot")

local MAX_MASTER_LOOT_CANDIDATES = 40

-- Events logged as-is with all their arguments. Trace = kept in the report, not printed to chat.
local PASSIVE_EVENTS = {
    ENCOUNTER_START = "Info",
    ENCOUNTER_END = "Info",
    BOSS_KILL = "Info",
    ENCOUNTER_LOOT_RECEIVED = "Info",
    LOOT_HISTORY_UPDATE_ENCOUNTER = "Trace",
    OPEN_MASTER_LOOT_LIST = "Info",
    PARTY_LOOT_METHOD_CHANGED = "Info",
    CHAT_MSG_LOOT = "Trace",
    START_LOOT_ROLL = "Trace",
    LOOT_READY = "Trace",
    LOOT_SLOT_CLEARED = "Trace",
    LOOT_CLOSED = "Trace",
}

--- Retail convention: party index 0 is the player, 1 to 4 are party1 to party4; raid index n is raidn.
local function masterLooterUnit(partyMaster, raidMaster)
    if type(raidMaster) == "number" then
        return "raid" .. raidMaster
    end
    if partyMaster == 0 then
        return "player"
    end
    if type(partyMaster) == "number" then
        return "party" .. partyMaster
    end
end

local function describeLootMethod()
    local ok, method, partyMaster, raidMaster = Compat.GetLootMethod()
    if not ok then
        return Util.Join("méthode de butin indisponible :", method)
    end
    local unit = masterLooterUnit(partyMaster, raidMaster)
    local masterLooter = "aucun"
    if unit then
        local _, name = Compat.GetUnitName(unit, true)
        masterLooter = Util.Safe(name) .. " (" .. unit .. ")"
    end
    return Util.Join("méthode de butin", Util.EnumName("LootMethod", method), "maître du butin", masterLooter)
end

local function describeCandidates(slot)
    local names = {}
    for index = 1, MAX_MASTER_LOOT_CANDIDATES do
        local ok, name = Compat.GetMasterLootCandidate(slot, index)
        if not ok then
            return Util.Safe(name)
        end
        if name then
            names[#names + 1] = Util.Safe(name)
        end
    end
    return #names > 0 and table.concat(names, ", ") or "aucun"
end

local function onLootOpened()
    local itemCount = GetNumLootItems()
    log.Info("LOOT_OPENED", describeLootMethod(), "objets :", itemCount)
    for slot = 1, itemCount do
        log.Info("emplacement", slot, GetLootSlotLink(slot) or "(sans lien)", "candidats :", describeCandidates(slot))
    end
end

local reportedDrops = {}

--- Group loot: the loot history fires several times per item while players roll; report each winner once.
local function onLootHistoryDrop(encounterId, lootListId)
    local ok, drop = Compat.GetSortedInfoForDrop(encounterId, lootListId)
    if not ok or type(drop) ~= "table" or Util.IsSecret(drop) then
        log.Trace("LOOT_HISTORY_UPDATE_DROP", encounterId, lootListId, "détail indisponible :", drop)
        return
    end
    if drop.winner == nil or reportedDrops[lootListId] then
        log.Trace("LOOT_HISTORY_UPDATE_DROP", encounterId, lootListId, drop)
        return
    end
    reportedDrops[lootListId] = true
    log.Ok("butin attribué : rencontre", encounterId, drop.itemHyperlink, "gagnant", drop.winner)
    log.Trace("détail du tirage", drop)
end

local function hookMasterLoot()
    if type(GiveMasterLoot) ~= "function" then
        log.Trace("GiveMasterLoot absente : attribution par maître du butin impossible à capter")
        return
    end
    hooksecurefunc("GiveMasterLoot", function(slot, candidateIndex)
        local _, candidate = Compat.GetMasterLootCandidate(slot, candidateIndex)
        log.Ok("GiveMasterLoot", GetLootSlotLink(slot), "attribué à", candidate)
    end)
end

local function listen(event, handler)
    if not ns.Events.On(event, handler) then
        log.Trace("événement refusé :", event)
    end
end

local function status()
    local name, instanceType, difficultyId, difficultyName, maxPlayers, _, _, instanceId = GetInstanceInfo()
    log.Info("instance", name, instanceType, "id", instanceId, "difficulté", difficultyId, difficultyName,
        "joueurs max", maxPlayers)
    log.Info(describeLootMethod())
    local ok, inProgress = Compat.IsEncounterInProgress()
    log.Info("rencontre en cours :", ok and Util.Safe(inProgress) or "API absente")
end

ns.Registry.Register({
    id = "loot",
    description = "boss tués, méthode de butin, attributions (écoute passive en permanence)",
    Setup = function()
        for event, level in pairs(PASSIVE_EVENTS) do
            listen(event, function(...)
                log[level](event, ...)
            end)
        end
        listen("LOOT_OPENED", onLootOpened)
        listen("LOOT_HISTORY_UPDATE_DROP", onLootHistoryDrop)
        hookMasterLoot()
    end,
    commands = {
        { name = "status", run = status },
    },
})
