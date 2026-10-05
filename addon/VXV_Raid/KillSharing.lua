local _, ns = ...

--- The bosses already killed at the event, for a player who joins the raid late (P8.1): once in the group, the
--- player's addon asks for them; the master looter's addon (or, without one, the leader's) answers with the kills of
--- its log, and the player's log adds those it missed. The next boss follows.
local KillSharing = {}
ns.KillSharing = KillSharing

local BossLoot, Group, RaidData, RaidLog = ns.BossLoot, ns.Group, ns.RaidData, ns.RaidLog

local ASK, KILLS = "raid.kills.ask", "raid.kills"
-- Players joining together are answered once: the answer goes to the whole group.
local ANSWER_GAP_SECONDS = 10

local askedInGroup = false
local lastAnswerAt

--- The one who tells the kills: the master looter, else the leader.
local function referee()
    return BossLoot.MasterLooter() or Group.Leader()
end

--- Asks the group once per group joined, with the event's data.
local function ask()
    local event = RaidData.Current()
    if event ~= nil and IsInGroup() and not askedInGroup then
        askedInGroup = true
        VXV.Broadcast(ASK, { eventId = event.id }, Group.Channel())
    end
end

VXV.OnMessage(ASK, function(payload, sender)
    local log, me = RaidLog.Current(), VXV.PlayerName()
    local answeredLately = lastAnswerAt ~= nil and GetTime() - lastAnswerAt < ANSWER_GAP_SECONDS
    if sender == me or referee() ~= me or log == nil or #log.kills == 0 or type(payload) ~= "table"
        or payload.eventId ~= log.eventId or answeredLately then
        return
    end
    lastAnswerAt = GetTime()
    local kills = {}
    for _, kill in ipairs(log.kills) do
        kills[#kills + 1] = { encounterId = kill.encounterId, boss = kill.boss, at = kill.at }
    end
    VXV.Broadcast(KILLS, { eventId = log.eventId, kills = kills }, Group.Channel())
end)

VXV.OnMessage(KILLS, function(payload, sender)
    if sender ~= VXV.PlayerName() and sender == referee() and type(payload) == "table"
        and type(payload.kills) == "table" then
        RaidLog.AddKills(tostring(payload.eventId), payload.kills)
    end
end)

-- The event's data may arrive after joining the group.
VXV.On("raid.updated", function()
    ask()
end)

-- Joining a group asks; leaving it lets the next one be asked.
VXV.OnEvent("GROUP_ROSTER_UPDATE", function()
    if IsInGroup() then
        ask()
    else
        askedInGroup = false
    end
end)

--- At login, already in a group: asks at once.
function KillSharing.Start()
    ask()
end
