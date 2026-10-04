local _, ns = ...

--- The record of each raid, kept in the saved data by event (plan 6.7): bosses killed, players present at the
--- kills, deaths during the encounters, and every item given. The master looter's addon records each give as
--- it happens and sends it to the group: their record is the reference. Exported for the website as VXV-LOG-1.
local RaidLog = {}
ns.RaidLog = RaidLog

local BossLoot, Distribution, Group, RaidData = ns.BossLoot, ns.Distribution, ns.Group, ns.RaidData

local RECORDED = "loot.recorded"
local HEADER = "VXV-LOG-1"
local DEATH_CHECK_SECONDS = 1
-- Older raids are forgotten: the website keeps them all.
local MAX_LOGS = 20

local saved
local inEncounter = false
local deadNow = {}

--- Takes the module's saved data at start-up.
function RaidLog.Restore(data)
    saved = data
    saved.logs = type(saved.logs) == "table" and saved.logs or {}
end

--- The logs, newest raid first.
function RaidLog.All()
    local list = {}
    for _, log in pairs(saved and saved.logs or {}) do
        list[#list + 1] = log
    end
    table.sort(list, function(left, right)
        return left.startsAt > right.startsAt
    end)
    return list
end

local function forgetOldest()
    local list = RaidLog.All()
    for index = MAX_LOGS + 1, #list do
        saved.logs[list[index].eventId] = nil
    end
end

--- The log of the current event, created at its first use; nil without event.
function RaidLog.Current()
    local event = RaidData.Current()
    if event == nil or saved == nil then
        return nil
    end
    local log = saved.logs[event.id]
    if log == nil then
        log = { eventId = event.id, title = event.title, startsAt = event.startsAt, kills = {}, present = {},
            deaths = {}, loots = {} }
        saved.logs[event.id] = log
        forgetOldest()
    end
    return log
end

local function changed()
    VXV.Emit("raid.log")
end

local function checkDeaths()
    if not inEncounter then
        return
    end
    local log = RaidLog.Current()
    for _, member in ipairs(Group.Members()) do
        local dead = UnitIsDeadOrGhost(member.unit) == true
        if dead and not deadNow[member.name] and log ~= nil then
            log.deaths[member.name] = (log.deaths[member.name] or 0) + 1
            changed()
        end
        deadNow[member.name] = dead
    end
    C_Timer.After(DEATH_CHECK_SECONDS, checkDeaths)
end

VXV.OnEvent("ENCOUNTER_START", function()
    local log = RaidLog.Current()
    if log ~= nil and log.startedAt == nil then
        log.startedAt = time()
    end
    inEncounter, deadNow = true, {}
    for _, member in ipairs(Group.Members()) do
        deadNow[member.name] = UnitIsDeadOrGhost(member.unit) == true
    end
    C_Timer.After(DEATH_CHECK_SECONDS, checkDeaths)
end)

VXV.OnEvent("ENCOUNTER_END", function(encounterId, boss, _, _, success)
    inEncounter = false
    local log = RaidLog.Current()
    if log == nil or not (success == 1 or success == true) or VXV.IsSecret(boss) then
        return
    end
    log.startedAt = log.startedAt or time()
    log.endedAt = time()
    log.kills[#log.kills + 1] = { encounterId = encounterId, boss = boss, at = log.endedAt }
    for name in pairs(Group.Names()) do
        log.present[name] = true
    end
    changed()
end)

local function addLoot(eventId, loot)
    local log = saved and saved.logs[eventId]
    if log ~= nil then
        log.loots[#log.loots + 1] = loot
        changed()
    end
end

--- The master looter's give, captured whether made from the panel or from the game's own menu.
local function onGive(slot, candidateIndex)
    local drop, log = BossLoot.Current(), RaidLog.Current()
    local ok, winner = VXV.Compat.GetMasterLootCandidate(slot, candidateIndex)
    if drop == nil or log == nil or not ok or type(winner) ~= "string" then
        return
    end
    for _, item in ipairs(drop.items) do
        if item.slot == slot then
            local loot = { encounterId = drop.encounterId, boss = drop.boss, itemId = item.itemId, link = item.link,
                winner = winner, method = Distribution.MethodFor(slot, winner), at = time() }
            VXV.Broadcast(RECORDED, { eventId = log.eventId, loot = loot }, Group.Channel())
            return
        end
    end
end

if type(GiveMasterLoot) == "function" then
    hooksecurefunc("GiveMasterLoot", onGive)
end

-- The master looter's record is the reference: every member keeps it.
VXV.OnMessage(RECORDED, function(payload, sender)
    local loot = type(payload) == "table" and payload.loot
    if type(loot) ~= "table" or (sender ~= VXV.PlayerName() and sender ~= BossLoot.MasterLooter()) then
        return
    end
    addLoot(tostring(payload.eventId), {
        encounterId = tonumber(loot.encounterId),
        boss = tostring(loot.boss),
        itemId = tonumber(loot.itemId),
        link = tostring(loot.link),
        winner = tostring(loot.winner),
        method = tostring(loot.method),
        at = tonumber(loot.at),
    })
end)

local function sortedNames(set)
    local names = {}
    for name in pairs(set) do
        names[#names + 1] = name
    end
    table.sort(names)
    return names
end

--- The log as the website imports it, one record per line:
--- R;event id;start (Unix seconds);end; K;encounter id;time; P;character present; L;encounter id;item id;
--- winner;method;time; D;character;deaths. Any change of format increments the version.
function RaidLog.Export(log)
    local lines = { HEADER, table.concat({ "R", log.eventId, log.startedAt or "", log.endedAt or "" }, ";") }
    for _, kill in ipairs(log.kills) do
        lines[#lines + 1] = table.concat({ "K", kill.encounterId, kill.at }, ";")
    end
    for _, name in ipairs(sortedNames(log.present)) do
        lines[#lines + 1] = "P;" .. name
    end
    for _, loot in ipairs(log.loots) do
        lines[#lines + 1] = table.concat({ "L", loot.encounterId, loot.itemId, loot.winner, loot.method, loot.at },
            ";")
    end
    for _, name in ipairs(sortedNames(log.deaths)) do
        lines[#lines + 1] = table.concat({ "D", name, log.deaths[name] }, ";")
    end
    return table.concat(lines, "\n")
end
