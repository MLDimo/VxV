local ns = select(2, ...).Missions

--- The counter each kind of mission reads (P12.3), never what a player says: the game's own where it keeps one (the
--- Statistics tab of WoW Forever, measured on 6 October, the honorable kills, the character's level), else the
--- gatherings the addon counts itself (Gathering.lua: the game keeps no count of herbs, ores and skins).
local Counters = {}
ns.Counters = Counters

local Gathering = ns.Gathering

--- What each kind counts, as the website names it (packages/server/src/domain/missions.ts).
Counters.LABELS = {
    fishing = { name = "Pêche", counts = "pêches réussies" },
    herbalism = { name = "Herboristerie", counts = "herbes cueillies" },
    mining = { name = "Minage", counts = "filons minés" },
    skinning = { name = "Dépeçage", counts = "peaux dépecées" },
    honorableKills = { name = "Victoires honorables", counts = "victoires honorables" },
    levels = { name = "Gain de niveau", counts = "niveaux gagnés" },
    level60 = { name = "Niveau 60", counts = "niveaux" },
}
--- The kinds in the website's order.
Counters.KINDS = { "fishing", "herbalism", "mining", "skinning", "honorableKills", "levels", "level60" }
--- The race to the top level: the first character there wins, the others ranked by their highest level.
Counters.RACE = "level60"
Counters.TOP_LEVEL = 60

-- The Statistics tab's ids, measured in game with the probe on 6 October (/vxvtest counters list): « Poissons et
-- autres objets pêchés », every successful catch.
local STATISTICS = {
    fishing = 1456,
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

local function gathered(kind)
    return function()
        return Gathering.Count(VXV.PlayerName(), kind)
    end
end

-- The game answers one guild roster request every 10 seconds.
local ROSTER_EVERY_SECONDS = 10
local rosterAskedAt

--- The player's level, as the guild roster tells it; the roster is asked again for the next reading.
local function level()
    local me = VXV.PlayerName()
    if rosterAskedAt == nil or GetTime() - rosterAskedAt >= ROSTER_EVERY_SECONDS then
        rosterAskedAt = GetTime()
        VXV.Compat.RequestGuildRoster()
    end
    for _, member in ipairs(VXV.GuildMembers()) do
        if member.name == me then
            return member.level
        end
    end
end

local READERS = {
    honorableKills = function()
        local ok, kills = VXV.Compat.GetPVPLifetimeStats()
        return ok and number(kills) or nil
    end,
    levels = level,
    level60 = level,
    herbalism = gathered("herbalism"),
    mining = gathered("mining"),
    skinning = gathered("skinning"),
}
for kind, id in pairs(STATISTICS) do
    READERS[kind] = statistic(id)
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
