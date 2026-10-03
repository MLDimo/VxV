local _, ns = ...

--- T8: the game's own counters (statistics, PvP kills) missions and titles would rely on.
--- "diff" shows what an action changed, e.g. whether killing a grey monster is counted.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("counters")

local PRINTED_COUNTERS = 10
local PVP_KILLS_KEY = "pvp"

local snapshot

--- Reads every counter available: { [key] = { name, value } }.
local function readCounters()
    local counters = {}
    local ok, categories = Compat.GetStatisticsCategoryList()
    if ok and type(categories) == "table" then
        for _, categoryId in ipairs(categories) do
            local _, count = Compat.GetCategoryNumAchievements(categoryId)
            for index = 1, tonumber(count) or 0 do
                local _, id, name = Compat.GetAchievementInfo(categoryId, index)
                if id then
                    local _, value = Compat.GetStatistic(id)
                    counters[tostring(id)] = { name = Util.Safe(name), value = Util.Safe(value) }
                end
            end
        end
    else
        log.Fail("statistiques illisibles :", categories)
    end
    local okPvp, honorableKills = Compat.GetPVPLifetimeStats()
    if okPvp then
        counters[PVP_KILLS_KEY] = { name = "victoires honorables (JcJ)", value = Util.Safe(honorableKills) }
    else
        log.Fail("victoires honorables illisibles :", honorableKills)
    end
    return counters
end

local function list(args)
    local filter = args:lower()
    local counters = readCounters()
    local keys = {}
    for key, counter in pairs(counters) do
        if counter.name:lower():find(filter, 1, true) then
            keys[#keys + 1] = key
        end
    end
    table.sort(keys, function(left, right)
        return counters[left].name < counters[right].name
    end)
    log.Info(#keys, "compteur(s)", filter ~= "" and ("contenant « " .. filter .. " »") or "",
        ": les", PRINTED_COUNTERS, "premiers ici, tous dans le rapport")
    for index, key in ipairs(keys) do
        local logCounter = index <= PRINTED_COUNTERS and log.Info or log.Trace
        logCounter(key, counters[key].name, "=", counters[key].value)
    end
end

local function diff()
    local counters = readCounters()
    if not snapshot then
        snapshot = counters
        log.Info("référence enregistrée : faire l'action à mesurer (ex. tuer un monstre gris),",
            "puis retaper la commande")
        return
    end
    local changed = 0
    for key, counter in pairs(counters) do
        local before = snapshot[key]
        if before and before.value ~= counter.value then
            changed = changed + 1
            log.Ok(counter.name, ":", before.value, "->", counter.value)
        end
    end
    snapshot = counters
    log.Info(changed, "compteur(s) changé(s) ; nouvelle référence enregistrée")
end

ns.Registry.Register({
    id = "counters",
    description = "compteurs du jeu (statistiques, victoires JcJ) et ce qu'une action y change",
    commands = {
        { name = "list", usage = "[motif]", run = list },
        { name = "diff", run = diff },
    },
})
