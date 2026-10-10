local ns = select(2, ...).Core

--- Data the guild's addons pass on to each other (the event's in P5, the bets' in P11): an officer's copy goes to
--- every connected member. A member who logs in asks for newer data: one officer holding them sends them again to
--- the guild, the others standing back once they see the offer.
local SharedData = {}
ns.SharedData = SharedData

local Comm, Names, Presence = ns.Comm, ns.Names, ns.Presence

-- Online officers answer in alphabetical order, this many seconds apart, unless one already offered.
local ANSWER_GAP_SECONDS = 3
-- After sending, an officer leaves the next asks aside for a while: those members ask again.
local SEND_PAUSE_SECONDS = 30
-- A member offered newer data asks again when they did not arrive (pieces lost while logging in).
local ASK_AGAIN_SECONDS = 45
local MAX_ASKS = 3
-- Players' clocks may be wrong: data dated further in the future would block every later update.
local CLOCK_TOLERANCE_SECONDS = 24 * 60 * 60

--- Whether data an addon of the guild sent replace the current ones: newer, and sent by an officer named in both
--- (in the new ones only, for a member who has none yet). Data: { exportedAt, officers = { [name] = true } }.
function SharedData.Accepts(data, current, sender)
    if sender == nil or not data.officers[sender] or data.exportedAt > time() + CLOCK_TOLERANCE_SECONDS then
        return false
    end
    return current == nil or (current.officers[sender] == true and data.exportedAt > current.exportedAt)
end

--- Shares a part's data under its name ("raid": messages raid.data, raid.ask and raid.offer). The source tells
--- the data: { Text(), ExportedAt() (Unix seconds, 0 without data), IsOfficer(name), Receive(text, sender) }.
--- Returns { Send(), Start() }: Send after the data changed (an import), Start once the player is in the world.
function SharedData.Create(name, source)
    local DATA, ASK, OFFER = name .. ".data", name .. ".ask", name .. ".offer"
    local asks, lastSendAt, answerPlanned, offerSeen = 0, nil, false, false

    local function me()
        return Names.OfUnit("player")
    end

    local function send()
        Comm.Broadcast(OFFER, { exportedAt = source.ExportedAt() })
        Comm.Broadcast(DATA, { text = source.Text() })
        lastSendAt = GetTime()
    end

    local function ask()
        asks = asks + 1
        Comm.Broadcast(ASK, { exportedAt = source.ExportedAt() })
    end

    --- Position of this player among the online officers, in alphabetical order, from 0.
    local function officerRank(player)
        local rank = 0
        for _, online in ipairs(Presence.Online()) do
            if online == player then
                return rank
            end
            if source.IsOfficer(online) then
                rank = rank + 1
            end
        end
        return rank
    end

    local function planAnswer(theirs)
        local player, mine = me(), source.ExportedAt()
        local pausing = lastSendAt ~= nil and GetTime() - lastSendAt < SEND_PAUSE_SECONDS
        if not source.IsOfficer(player) or mine <= theirs or answerPlanned or pausing then
            return
        end
        answerPlanned, offerSeen = true, false
        C_Timer.After(officerRank(player) * ANSWER_GAP_SECONDS, function()
            answerPlanned = false
            if not offerSeen then
                send()
            end
        end)
    end

    Comm.On(ASK, function(payload, sender)
        if type(payload) == "table" and sender ~= me() then
            planAnswer(tonumber(payload.exportedAt) or 0)
        end
    end)

    Comm.On(OFFER, function(payload, sender)
        local offered = type(payload) == "table" and tonumber(payload.exportedAt)
        if not offered or sender == me() then
            return
        end
        if offered >= source.ExportedAt() then
            offerSeen = true
        end
        if offered > source.ExportedAt() then
            C_Timer.After(ASK_AGAIN_SECONDS, function()
                if source.ExportedAt() < offered and asks < MAX_ASKS then
                    ask()
                end
            end)
        end
    end)

    Comm.On(DATA, function(payload, sender)
        if type(payload) == "table" and type(payload.text) == "string" and sender ~= me() then
            source.Receive(payload.text, sender)
        end
    end)

    return { Send = send, Start = ask }
end
