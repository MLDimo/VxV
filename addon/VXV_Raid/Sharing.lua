local _, ns = ...

--- The event's data travel between the guild's addons. An officer's import goes to every connected member.
--- A member who logs in asks for newer data: one officer holding them sends them again to the guild, the
--- others standing back once they see the offer.
local Sharing = {}
ns.Sharing = Sharing

local RaidData = ns.RaidData

local DATA, ASK, OFFER = "raid.data", "raid.ask", "raid.offer"
-- Online officers answer in alphabetical order, this many seconds apart, unless one already offered.
local ANSWER_GAP_SECONDS = 3
-- After sending, an officer leaves the next asks aside for a while: those members ask again.
local SEND_PAUSE_SECONDS = 30
-- A member offered newer data asks again when they did not arrive (pieces lost while logging in).
local ASK_AGAIN_SECONDS = 45
local MAX_ASKS = 3

local asks = 0
local lastSendAt
local answerPlanned, offerSeen = false, false

local function send()
    local text = RaidData.Text()
    VXV.Broadcast(OFFER, { exportedAt = RaidData.ExportedAt() })
    VXV.Broadcast(DATA, { text = text })
    lastSendAt = GetTime()
end

--- Sends the current data to the guild: after an officer's import.
function Sharing.Send()
    send()
end

local function ask()
    asks = asks + 1
    VXV.Broadcast(ASK, { exportedAt = RaidData.ExportedAt() })
end

--- Position of this player among the online officers, in alphabetical order, from 0.
local function officerRank(me)
    local rank = 0
    for _, name in ipairs(VXV.Online()) do
        if name == me then
            return rank
        end
        if RaidData.IsOfficer(name) then
            rank = rank + 1
        end
    end
    return rank
end

local function planAnswer(theirs)
    local me, mine = VXV.PlayerName(), RaidData.ExportedAt()
    local pausing = lastSendAt ~= nil and GetTime() - lastSendAt < SEND_PAUSE_SECONDS
    if not RaidData.IsOfficer(me) or mine <= theirs or answerPlanned or pausing then
        return
    end
    answerPlanned, offerSeen = true, false
    C_Timer.After(officerRank(me) * ANSWER_GAP_SECONDS, function()
        answerPlanned = false
        if not offerSeen then
            send()
        end
    end)
end

local function isMine(sender)
    return sender == VXV.PlayerName()
end

VXV.OnMessage(ASK, function(payload, sender)
    if type(payload) == "table" and not isMine(sender) then
        planAnswer(tonumber(payload.exportedAt) or 0)
    end
end)

VXV.OnMessage(OFFER, function(payload, sender)
    local offered = type(payload) == "table" and tonumber(payload.exportedAt)
    if not offered or isMine(sender) then
        return
    end
    if offered >= RaidData.ExportedAt() then
        offerSeen = true
    end
    if offered > RaidData.ExportedAt() then
        C_Timer.After(ASK_AGAIN_SECONDS, function()
            if RaidData.ExportedAt() < offered and asks < MAX_ASKS then
                ask()
            end
        end)
    end
end)

VXV.OnMessage(DATA, function(payload, sender)
    if type(payload) == "table" and type(payload.text) == "string" and not isMine(sender) then
        RaidData.Receive(payload.text, sender)
    end
end)

--- Once the player is in the world: asks the guild for data newer than those kept.
function Sharing.Start()
    ask()
end
