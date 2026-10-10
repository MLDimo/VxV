local _, ns = ...

--- Changes made in game in the PvP place: a sign-up to an outing, an outing an officer creates, a challenge, its
--- answer, a duel called off or conceded, and the result the game showed. Each waits for the website ("en attente")
--- until the PvP data bring back what became of it; the core sends it to the website (VXV.PendingChanges). A change:
--- { kind = "signup", eventId, role, spec, status }, { kind = "pvpEvent", title, date, time, roleId, reason },
--- { kind = "duel", opponentId, date, time, place }, { kind = "duelAnswer", duelId, accept },
--- { kind = "duelConcede" | "duelCancel", duelId } or { kind = "duelResult", duelId, winner, loser }.
local Changes = {}
ns.Changes = Changes

local PvpData = ns.PvpData

local FIELDS = {
    signup = { eventId = "string", role = "string", spec = "string", status = "string" },
    pvpEvent = { title = "string", date = "string", time = "string", roleId = "string", reason = "string" },
    duel = { opponentId = "string", date = "string", time = "string", place = "string" },
    duelAnswer = { duelId = "string", accept = "boolean" },
    duelConcede = { duelId = "string" },
    duelCancel = { duelId = "string" },
    duelResult = { duelId = "string", winner = "string", loser = "string" },
}

local changes = VXV.PendingChanges({
    message = "pvp.change",
    fields = FIELDS,
    canRelay = function()
        return PvpData.IsOfficer(VXV.PlayerName())
    end,
    changed = function()
        VXV.Emit("pvp.changes")
    end,
})

--- Takes the module's saved data at start-up: the changes still waiting.
Changes.Restore = changes.Restore

--- Records a change of the player ({ kind, ... }): true when recorded.
function Changes.Submit(fields)
    return changes.Submit(fields) ~= nil
end

--- The player's newest change waiting for the website about this outing or duel (its id), else of this kind when no
--- id is given; nil without.
function Changes.Pending(kind, id)
    local found
    for _, change in pairs(changes.Pending()) do
        local about = id == nil or change.eventId == id or change.duelId == id
        if (kind == nil or change.kind == kind) and about and (found == nil or change.at > found.at) then
            found = change
        end
    end
    return found
end

-- The PvP data bring the website's answers: no outbox keeps those changes, and the player learns a refusal.
VXV.On("pvp.updated", function(data)
    for id, result in pairs(data.results) do
        changes.Settle(id, result)
    end
    VXV.Emit("pvp.changes")
end)
