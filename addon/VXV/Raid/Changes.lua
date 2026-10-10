local ns = select(2, ...).Raid

--- Changes made in game (P7.5): the player's sign-up and soft reserves, an officer's exclusions and events. Each
--- waits for the website ("en attente") until the event's data bring back what became of it (confirmed or refused,
--- with why); the core sends it to the website (VXV.PendingChanges). A change carries its event (eventId) and, by
--- kind: role, spec, status (signup), itemIds (reserves), itemId, excluded, reason (exclusion), date, time, raidIds,
--- softReserves, roleId, reason (an event an officer creates, P9.2: it belongs to no event yet).
local Changes = {}
ns.Changes = Changes

local RaidData = ns.RaidData

-- The fields of each kind, with their type, kept from a change relayed by another player.
local FIELDS = {
    signup = { eventId = "string", role = "string", spec = "string", status = "string" },
    reserves = { eventId = "string", itemIds = "numbers" },
    exclusion = { eventId = "string", itemId = "number", excluded = "boolean", reason = "string" },
    event = {
        eventId = "string", date = "string", time = "string", raidIds = "strings", softReserves = "number",
        roleId = "string", reason = "string",
    },
}

local answers = {}
local changes = VXV.PendingChanges({
    message = "raid.change",
    fields = FIELDS,
    canRelay = function()
        return RaidData.IsOfficer(VXV.PlayerName())
    end,
    changed = function()
        VXV.Emit("raid.changes")
    end,
})

--- Takes the module's saved data at start-up: the changes still waiting, and the last answer of each kind.
function Changes.Restore(data)
    changes.Restore(data)
    data.answers = type(data.answers) == "table" and data.answers or {}
    answers = data.answers
end

--- The player's change of this kind waiting for the website, for the current event; the newest one.
function Changes.Pending(kind)
    local event, found = RaidData.Current(), nil
    for _, change in pairs(changes.Pending()) do
        if event ~= nil and change.eventId == event.id and change.kind == kind
            and (found == nil or change.at > found.at) then
            found = change
        end
    end
    return found
end

--- The website's last answer to a change of this kind, for the current event: { accepted, message }, or nil.
function Changes.Answer(kind)
    local event, answer = RaidData.Current(), answers[kind]
    return event ~= nil and answer ~= nil and answer.eventId == event.id and answer or nil
end

--- Records a change of the player for the current event ({ kind, ... }). False without event, unless it creates
--- one.
function Changes.Submit(fields)
    local event = RaidData.Current()
    if event == nil and fields.kind ~= "event" then
        return false
    end
    local change = { eventId = event and event.id or "" }
    for key, value in pairs(fields) do
        change[key] = value
    end
    return changes.Submit(change) ~= nil
end

-- The event's data bring the website's answers: no outbox keeps those changes, and the player learns a refusal.
VXV.On("raid.updated", function(event)
    for id, result in pairs(event.results) do
        local change = changes.Settle(id, result)
        if change ~= nil then
            answers[change.kind] = { eventId = change.eventId, accepted = result.accepted, message = result.message }
        end
    end
    VXV.Emit("raid.changes")
end)
