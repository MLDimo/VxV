local _, ns = ...

--- The missions for this player: where each stands, its ranking (the website's, completed by the scores the
--- guild's addons tell live), and how the data travel between the guild's addons (the core's shared data).
local Quests = {}
ns.Quests = Quests

local QuestsData = ns.QuestsData

Quests.Sharing = VXV.ShareData("quetes", {
    Text = QuestsData.Text,
    ExportedAt = QuestsData.ExportedAt,
    IsOfficer = QuestsData.IsOfficer,
    Receive = QuestsData.Receive,
})

-- Scores told live in the guild (P12.5), by mission then member: { name, class, score, reachedAt }.
local live = {}

--- The website's id of the member playing this character (the player's by default), or nil.
function Quests.MemberId(data, name)
    return data ~= nil and data.members[name or VXV.PlayerName() or ""] or nil
end

--- "upcoming", "running", "ended" (waiting for an officer's validation) or "closed".
function Quests.Status(mission, now)
    if mission.closedAt ~= nil then
        return "closed"
    end
    if now < mission.startsAt then
        return "upcoming"
    end
    return now < mission.endsAt and "running" or "ended"
end

--- The missions with this status, the soonest ending first.
function Quests.WithStatus(data, now, status)
    local found = {}
    for _, mission in ipairs(data ~= nil and data.missions or {}) do
        if Quests.Status(mission, now) == status then
            found[#found + 1] = mission
        end
    end
    table.sort(found, function(left, right)
        return left.endsAt < right.endsAt
    end)
    return found
end

--- A member's score told live: kept when it is ahead of what is known.
function Quests.Hear(missionId, memberId, entry)
    live[missionId] = live[missionId] or {}
    local known = live[missionId][memberId]
    if known == nil or entry.score > known.score then
        live[missionId][memberId] = entry
        VXV.Emit("quetes.live", missionId)
    end
end

--- The mission's ranking: the website's scores, each raised by a higher one told live; the best first, and in a tie
--- the first to reach the score.
function Quests.Ranking(mission)
    local byMember = {}
    for _, score in ipairs(mission.scores) do
        byMember[score.memberId] = score
    end
    for memberId, entry in pairs(live[mission.id] or {}) do
        local known = byMember[memberId]
        if known == nil or entry.score > known.score then
            byMember[memberId] = { memberId = memberId, name = known and known.name or entry.name,
                class = known and known.class or entry.class, score = entry.score, reachedAt = entry.reachedAt }
        end
    end
    local ranking = {}
    for _, score in pairs(byMember) do
        ranking[#ranking + 1] = score
    end
    table.sort(ranking, function(left, right)
        if left.score ~= right.score then
            return left.score > right.score
        end
        return left.reachedAt < right.reachedAt
    end)
    return ranking
end
