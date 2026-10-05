local _, ns = ...

--- Changes made in game (P7.5): the player's sign-up and soft reserves, an officer's exclusions. Each waits for the
--- website ("en attente") until the event's data bring back what became of it (confirmed or refused, with why).
--- It reaches the website through the player's companion (VXV_Sync), or through an officer's: every change goes to
--- the guild, and an officer with the companion relays those of the others. The website checks every right.
--- A change: { id, eventId, author = "Prénom Nom", at, kind = "signup" | "reserves" | "exclusion" | "event", ... },
--- with role, spec, status (signup), itemIds (reserves), itemId, excluded, reason (exclusion), date, time, raidIds,
--- softReserves, reason (an event an officer creates, P9.2: it belongs to no event yet).
local Changes = {}
ns.Changes = Changes

local Companion, RaidData = ns.Companion, ns.RaidData

local CHANGE = "raid.change"
local OUTBOX = "changes"
-- The website's answer for a change: a change older than this without one is forgotten.
local KEEP_SECONDS = 14 * 24 * 60 * 60
-- Pending changes go to the guild again when a member connects, this often at most: an officer may relay them.
local RESEND_GAP_SECONDS = 60
local ID_RANDOM = 999999
local WAITING_COMPANION = "Changement enregistré : ton compagnon l'enverra au site au prochain /reload."
local WAITING_RELAY = "Changement enregistré : un officier équipé du compagnon VXV le relaiera au site."
local DONE = "Site VXV : %s"
local REFUSED = "Site VXV, changement refusé : %s"
-- The fields of each kind, with their type, kept from a change relayed by another player.
local FIELDS = {
    signup = { role = "string", spec = "string", status = "string" },
    reserves = { itemIds = "table" },
    exclusion = { itemId = "number", excluded = "boolean", reason = "string" },
    event = { date = "string", time = "string", raidIds = "table", softReserves = "number", reason = "string" },
}

local saved = { pending = {}, answers = {} }
local lastSentAt

--- Takes the module's saved data at start-up: the changes still waiting, and the last answer of each kind.
function Changes.Restore(data)
    saved = data
    saved.pending = type(saved.pending) == "table" and saved.pending or {}
    saved.answers = type(saved.answers) == "table" and saved.answers or {}
    for id, change in pairs(saved.pending) do
        if (tonumber(change.at) or 0) < time() - KEEP_SECONDS then
            saved.pending[id] = nil
        end
    end
end

--- The player's change of this kind waiting for the website, for the current event; the newest one.
function Changes.Pending(kind)
    local event, found = RaidData.Current(), nil
    for _, change in pairs(saved.pending) do
        if event ~= nil and change.eventId == event.id and change.kind == kind
            and (found == nil or change.at > found.at) then
            found = change
        end
    end
    return found
end

--- The website's last answer to a change of this kind, for the current event: { accepted, message }, or nil.
function Changes.Answer(kind)
    local event, answer = RaidData.Current(), saved.answers[kind]
    return event ~= nil and answer ~= nil and answer.eventId == event.id and answer or nil
end

local function broadcastPending()
    lastSentAt = GetTime()
    for _, change in pairs(saved.pending) do
        VXV.Broadcast(CHANGE, change)
    end
end

--- Records a change of the player for the current event ({ kind, ... }): kept until the website answers, handed
--- over to the companion and sent to the guild. False without event, unless it creates one.
function Changes.Submit(fields)
    local event, author = RaidData.Current(), VXV.PlayerName()
    if (event == nil and fields.kind ~= "event") or author == nil then
        return false
    end
    local change = { eventId = event and event.id or "", author = author, at = time() }
    change.id = string.format("%s#%d#%d", author, change.at, math.random(ID_RANDOM))
    for key, value in pairs(fields) do
        change[key] = value
    end
    saved.pending[change.id] = change
    VXV.Emit("sync.put", OUTBOX, change.id, change)
    VXV.Broadcast(CHANGE, change)
    VXV.Print(Companion.Seen() and WAITING_COMPANION or WAITING_RELAY)
    VXV.Emit("raid.changes")
    return true
end

--- A change heard from another player, kept with its known fields only; the game tells who sent it, and its id
--- must be theirs. Nil when it is not one.
local function relayed(payload, sender)
    local fields = type(payload) == "table" and FIELDS[payload.kind]
    if not fields or type(payload.id) ~= "string" or payload.id:sub(1, #sender + 1) ~= sender .. "#"
        or type(payload.eventId) ~= "string" then
        return nil
    end
    local change = { id = payload.id, eventId = payload.eventId, author = sender, at = tonumber(payload.at) or 0,
        kind = payload.kind }
    for field, kind in pairs(fields) do
        if type(payload[field]) ~= kind then
            return nil
        end
        change[field] = payload[field]
    end
    if change.itemIds ~= nil then
        local itemIds = {}
        for _, itemId in ipairs(change.itemIds) do
            itemIds[#itemIds + 1] = tonumber(itemId)
        end
        change.itemIds = itemIds
    end
    if change.raidIds ~= nil then
        local raidIds = {}
        for _, raidId in ipairs(change.raidIds) do
            raidIds[#raidIds + 1] = tostring(raidId)
        end
        change.raidIds = raidIds
    end
    return change
end

-- An officer with the companion relays the others' changes; the website checks that the relay is an officer.
VXV.OnMessage(CHANGE, function(payload, sender)
    if sender == VXV.PlayerName() or not Companion.Seen() or not RaidData.IsOfficer(VXV.PlayerName()) then
        return
    end
    local change = relayed(payload, sender)
    if change ~= nil then
        VXV.Emit("sync.put", OUTBOX, change.id, change)
    end
end)

-- The event's data bring the website's answers: the player learns them, and no outbox keeps those changes.
VXV.On("raid.updated", function(event)
    for id, result in pairs(event.results) do
        local change = saved.pending[id]
        if change ~= nil then
            saved.pending[id] = nil
            saved.answers[change.kind] = { eventId = change.eventId, accepted = result.accepted,
                message = result.message }
            VXV.Print((result.accepted and DONE or REFUSED):format(result.message))
        end
        VXV.Emit("sync.put", OUTBOX, id, nil)
    end
    VXV.Emit("raid.changes")
end)

-- Pending changes go to the guild again when a member connects (an officer may relay them), and at login, when
-- they also go to the companion (installed meanwhile, perhaps).
local function resend()
    if next(saved.pending) ~= nil and (lastSentAt == nil or GetTime() - lastSentAt >= RESEND_GAP_SECONDS) then
        broadcastPending()
    end
end

VXV.On("modules.started", function()
    for id, change in pairs(saved.pending) do
        VXV.Emit("sync.put", OUTBOX, id, change)
    end
    resend()
end)
VXV.On("presence.changed", resend)
