local _, ns = ...

--- The game's counter each kind of mission reads (P12.3): only counters the game keeps itself, never what a player
--- says. The statistics' ids are those of WoW Forever's Statistics tab (phase 0, T8); a kind whose counter is not
--- measured yet is not read in game.
local Counters = {}
ns.Counters = Counters

--- What each kind counts, as the website names it (packages/server/src/domain/missions.ts).
Counters.LABELS = {
    fishing = { name = "Pêche", counts = "pêches réussies" },
    herbalism = { name = "Herboristerie", counts = "herbes cueillies" },
    mining = { name = "Minage", counts = "filons minés" },
    skinning = { name = "Dépeçage", counts = "peaux dépecées" },
    honorableKills = { name = "Victoires honorables", counts = "victoires honorables" },
}

-- The Statistics tab's ids of the gathering counters, measured in game with the probe (/vxvtest counters list).
local STATISTICS = {
    fishing = nil,
    herbalism = nil,
    mining = nil,
    skinning = nil,
}

--- A counter's value as a whole number, or nil when the client hides it or has none.
local function number(value)
    if VXV.IsSecret(value) then
        return nil
    end
    local digits = tostring(value or ""):match("^%s*(%d+)")
    return digits and tonumber(digits) or nil
end

local function statistic(id)
    return function()
        local ok, value = VXV.Compat.GetStatistic(id)
        -- A counter that never moved shows "--": nothing done yet.
        return ok and (number(value) or 0) or nil
    end
end

local READERS = {
    honorableKills = function()
        local ok, kills = VXV.Compat.GetPVPLifetimeStats()
        return ok and number(kills) or nil
    end,
}
for kind, id in pairs(STATISTICS) do
    READERS[kind] = id and statistic(id) or nil
end

--- The kinds whose counter the game gives this addon, in a fixed order.
function Counters.Readable()
    local kinds = {}
    for kind in pairs(READERS) do
        kinds[#kinds + 1] = kind
    end
    table.sort(kinds)
    return kinds
end

--- The counter of a kind for the player's character now, or nil when it cannot be read (not measured, in combat).
function Counters.Read(kind)
    local reader = READERS[kind]
    if reader == nil or InCombatLockdown() then
        return nil
    end
    return reader()
end
