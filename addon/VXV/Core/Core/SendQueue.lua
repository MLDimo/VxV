local ns = select(2, ...).Core

--- Addon messages leave at the pace WoW Forever allows (measured in phase 0): 10 in a row, then one per second,
--- and none during a boss encounter (chat lockdown). The queue keeps the order and waits instead of losing data.
local SendQueue = {}
ns.SendQueue = SendQueue

local Compat = ns.Compat

local BURST = 10
local SECONDS_PER_MESSAGE = 1
local RETRY_SECONDS = 1

local pending = {}
local credit = BURST
local lastRefillAt
local retryScheduled = false

local function refill()
    local now = GetTime()
    lastRefillAt = lastRefillAt or now
    local earned = math.floor((now - lastRefillAt) / SECONDS_PER_MESSAGE)
    if earned > 0 then
        credit = math.min(BURST, credit + earned)
        lastRefillAt = lastRefillAt + earned * SECONDS_PER_MESSAGE
    end
end

local function inLockdown()
    local ok, locked = Compat.InChatMessagingLockdown()
    return ok and locked == true
end

--- The client answers with an Enum code on modern versions, a boolean on older ones.
local function wasThrottled(ok, result)
    local codes = Enum and Enum.SendAddonMessageResult
    return ok and codes ~= nil and result == codes.AddonMessageThrottle
end

local pump

local function retryLater()
    if not retryScheduled then
        retryScheduled = true
        C_Timer.After(RETRY_SECONDS, function()
            retryScheduled = false
            pump()
        end)
    end
end

pump = function()
    refill()
    while pending[1] ~= nil and credit >= 1 and not inLockdown() do
        local message = pending[1]
        local ok, result = Compat.SendAddonMessage(message.prefix, message.text, message.channel, message.target)
        if wasThrottled(ok, result) then
            credit = 0
            break
        end
        -- Sent, or refused for good (not in a guild, nobody to whisper): the next one goes either way.
        table.remove(pending, 1)
        credit = credit - 1
    end
    if pending[1] ~= nil then
        retryLater()
    end
end

function SendQueue.Push(prefix, text, channel, target)
    pending[#pending + 1] = { prefix = prefix, text = text, channel = channel, target = target }
    pump()
end

--- Sends what waited as soon as possible, e.g. when a boss encounter ends and lifts the lockdown.
SendQueue.Flush = pump
