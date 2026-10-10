local ns = select(2, ...).Core

--- Changes made in game (P7.5, P11): each waits for the website ("en attente") until the part's data bring back
--- what became of it. It reaches the website through the player's companion (the Sync part), or through an officer's:
--- every change goes to the guild, and an officer with the companion relays those of the others. The website checks
--- every right. A change: { id = "Prénom Nom#time#random", author, at, kind, ... the fields of its kind }.
local PendingChanges = {}
ns.PendingChanges = PendingChanges

local Bus, Chat, Comm, Names = ns.Bus, ns.Chat, ns.Comm, ns.Names

local OUTBOX = "changes"
-- A change older than this without an answer is forgotten.
local KEEP_SECONDS = 14 * 24 * 60 * 60
-- Pending changes go to the guild again when a member connects, this often at most: an officer may relay them.
local RESEND_GAP_SECONDS = 60
local ID_RANDOM = 999999
local WAITING_COMPANION = "Changement enregistré : ton compagnon l'enverra au site au prochain /reload."
local WAITING_RELAY = "Changement enregistré : un officier équipé du compagnon VXV le relaiera au site."
-- The website's refusal of the player's change; what it accepted shows in its data, without a message.
local REFUSED = "Site VXV, changement refusé : %s"
-- Lists in a change: their items are kept as numbers or as strings.
local LISTS = { numbers = tonumber, strings = tostring }

local companionSeen = false

-- The companion brought data at this launch (the Sync part): a /reload sends the changes to the website.
Bus.On("sync.inbox", function()
    companionSeen = true
end)

--- True when the player's companion brought data at this launch.
function PendingChanges.CompanionSeen()
    return companionSeen
end

--- A field of a change heard from another player, when it has its type: "string", "number", "boolean", or a list
--- of "numbers" or "strings".
local function fieldOf(value, kind)
    local item = LISTS[kind]
    if item == nil then
        return type(value) == kind and value or nil
    end
    if type(value) ~= "table" then
        return nil
    end
    local list = {}
    for _, element in ipairs(value) do
        list[#list + 1] = item(element)
    end
    return list
end

--- The changes of a part, sent under its message ("raid.change"). options: { message, fields = { [kind] = {
--- [field] = type } }, canRelay() (this player is an officer of the part's data), changed() (after any change) }.
--- Returns { Restore(saved), Submit(fields), Pending(), Settle(id, result) }.
function PendingChanges.Create(options)
    local saved = { pending = {} }
    local lastSentAt

    local function broadcastPending()
        lastSentAt = GetTime()
        for _, change in pairs(saved.pending) do
            Comm.Broadcast(options.message, change)
        end
    end

    --- A change heard from another player, kept with its known fields only; the game tells who sent it, and its id
    --- must be theirs. Nil when it is not one.
    local function relayed(payload, sender)
        local fields = type(payload) == "table" and options.fields[payload.kind]
        if not fields or type(payload.id) ~= "string" or payload.id:sub(1, #sender + 1) ~= sender .. "#" then
            return nil
        end
        local change = { id = payload.id, author = sender, at = tonumber(payload.at) or 0, kind = payload.kind }
        for field, kind in pairs(fields) do
            change[field] = fieldOf(payload[field], kind)
            if change[field] == nil then
                return nil
            end
        end
        return change
    end

    -- An officer with the companion relays the others' changes; the website checks that the relay is an officer.
    Comm.On(options.message, function(payload, sender)
        if sender == Names.OfUnit("player") or not companionSeen or not options.canRelay() then
            return
        end
        local change = relayed(payload, sender)
        if change ~= nil then
            Bus.Emit("sync.put", OUTBOX, change.id, change)
        end
    end)

    -- Pending changes go to the guild again when a member connects (an officer may relay them), and at login, when
    -- they also go to the companion (installed meanwhile, perhaps).
    local function resend()
        if next(saved.pending) ~= nil and (lastSentAt == nil or GetTime() - lastSentAt >= RESEND_GAP_SECONDS) then
            broadcastPending()
        end
    end

    Bus.On("modules.started", function()
        for id, change in pairs(saved.pending) do
            Bus.Emit("sync.put", OUTBOX, id, change)
        end
        resend()
    end)
    Bus.On("presence.changed", resend)

    local changes = {}

    --- Takes the module's saved data at start-up (its "pending" table), forgetting the changes too old.
    function changes.Restore(data)
        saved = data
        saved.pending = type(saved.pending) == "table" and saved.pending or {}
        for id, change in pairs(saved.pending) do
            if (tonumber(change.at) or 0) < time() - KEEP_SECONDS then
                saved.pending[id] = nil
            end
        end
    end

    --- Records a change of the player ({ kind, ... }): kept until the website answers, handed over to the
    --- companion and sent to the guild. Returns it; nil before the player is in the world.
    function changes.Submit(fields)
        local author = Names.OfUnit("player")
        if author == nil then
            return nil
        end
        local change = { author = author, at = time() }
        change.id = string.format("%s#%d#%d", author, change.at, math.random(ID_RANDOM))
        for key, value in pairs(fields) do
            change[key] = value
        end
        saved.pending[change.id] = change
        Bus.Emit("sync.put", OUTBOX, change.id, change)
        Comm.Broadcast(options.message, change)
        Chat.Print(companionSeen and WAITING_COMPANION or WAITING_RELAY)
        options.changed()
        return change
    end

    --- The changes waiting for the website, by id.
    function changes.Pending()
        return saved.pending
    end

    --- The website answered a change (by id; result = { accepted, message }): no outbox keeps it any more, and the
    --- player learns a refusal of theirs. Returns the player's change it settled, or nil when it was another player's
    --- (relayed) or already settled.
    function changes.Settle(id, result)
        local change = saved.pending[id]
        saved.pending[id] = nil
        Bus.Emit("sync.put", OUTBOX, id, nil)
        if change ~= nil and not result.accepted then
            Chat.Print(REFUSED:format(result.message))
        end
        return change
    end

    return changes
end
