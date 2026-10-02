local _, ns = ...

--- Step 0.3: addon communication on guild, group and raid channels (reach, size, throughput).
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("comm")

local PREFIX = "VXVProbe"
local SEPARATOR = ":"
local FILLER = "x"
local MESSAGE_SIZES = { 100, 200, 250, 255, 256, 300, 500, 1000 }
local DEFAULT_BURST_COUNT = 30
local BURST_SUMMARY_DELAY = 15
local MILLISECONDS = 1000

local lastMessageId = 0
local pingSentAt = {}
local receivedBursts = {}

local function newMessageId()
    lastMessageId = lastMessageId + 1
    return lastMessageId
end

local function encode(...)
    return table.concat({ ... }, SEPARATOR)
end

--- Retail returns an Enum code where older clients returned a boolean.
local function interpretResult(enumName, ok, result)
    if not ok then
        return false, Util.Safe(result)
    end
    local codes = Enum and Enum[enumName]
    local accepted
    if codes and type(result) == "number" then
        accepted = result == codes.Success
    else
        accepted = result ~= false
    end
    return accepted, Util.EnumName(enumName, result)
end

local function send(channel, text, target)
    return interpretResult("SendAddonMessageResult", Compat.SendAddonMessage(PREFIX, text, channel, target))
end

local function defaultChannels()
    local channels = {}
    if IsInGuild() then
        channels[#channels + 1] = "GUILD"
    end
    if IsInRaid() then
        channels[#channels + 1] = "RAID"
    elseif IsInGroup() then
        channels[#channels + 1] = "PARTY"
    end
    if LE_PARTY_CATEGORY_INSTANCE and IsInGroup(LE_PARTY_CATEGORY_INSTANCE) then
        channels[#channels + 1] = "INSTANCE_CHAT"
    end
    return channels
end

--- Runs the action on the requested channel, or on every channel currently available.
local function forEachChannel(channelArg, action)
    local channels = channelArg ~= "" and { channelArg:upper() } or defaultChannels()
    if #channels == 0 then
        log.Fail("aucun canal disponible : rejoindre une guilde ou un groupe")
        return
    end
    for _, channel in ipairs(channels) do
        action(channel)
    end
end

-- Senders ---------------------------------------------------------------------------------------

local function ping(args)
    local channelArg = Util.SplitFirst(args)
    forEachChannel(channelArg, function(channel)
        local id = newMessageId()
        pingSentAt[id] = GetTime()
        local accepted, result = send(channel, encode("PING", id))
        log.Check(accepted, "PING", id, "envoyé sur", channel, ":", result)
    end)
end

local function size(args)
    local channelArg = Util.SplitFirst(args)
    forEachChannel(channelArg, function(channel)
        for _, messageSize in ipairs(MESSAGE_SIZES) do
            local header = encode("SIZE", messageSize, "")
            local accepted, result = send(channel, header .. FILLER:rep(messageSize - #header))
            log.Check(accepted, "SIZE", messageSize, "octets envoyé sur", channel, ":", result)
        end
    end)
end

local function burst(args)
    local channelArg, countArg = Util.SplitFirst(args)
    if tonumber(channelArg) then
        channelArg, countArg = "", channelArg
    end
    local count = tonumber(countArg) or DEFAULT_BURST_COUNT
    forEachChannel(channelArg, function(channel)
        local id = newMessageId()
        local acceptedCount, firstRefusal = 0, nil
        for sequence = 1, count do
            local accepted, result = send(channel, encode("BURST", id, sequence, count))
            if accepted then
                acceptedCount = acceptedCount + 1
            elseif not firstRefusal then
                firstRefusal = "premier refus au n°" .. sequence .. " (" .. result .. ")"
            end
        end
        log.Check(acceptedCount == count, "BURST", id, "sur", channel, ":", acceptedCount, "/", count,
            "acceptés", firstRefusal or "")
    end)
end

-- Receivers: handler(sender, channel, text, ...fields) -------------------------------------------

local function onPing(sender, channel, _, id)
    log.Ok("PING", id, "reçu de", sender, "via", channel)
    local accepted, result = send("WHISPER", encode("PONG", id, channel), sender)
    if not accepted then
        log.Fail("PONG vers", sender, "refusé :", result)
    end
end

local function onPong(sender, _, _, id, pingChannel)
    local sentAt = pingSentAt[tonumber(id)]
    local delay = sentAt and string.format("%d ms", math.floor((GetTime() - sentAt) * MILLISECONDS)) or "inconnu"
    log.Ok("PONG", id, "de", sender, "pour le ping sur", pingChannel, ": aller-retour", delay)
end

local function onSize(sender, channel, text, declaredSize)
    log.Check(#text == tonumber(declaredSize), "SIZE", declaredSize, "reçu de", sender, "via", channel, ":",
        #text, "octets")
end

local function onBurst(sender, channel, _, id, _, count)
    local key = Util.Safe(sender) .. SEPARATOR .. id
    local state = receivedBursts[key]
    if not state then
        local now = GetTime()
        state = { received = 0, expected = tonumber(count), firstAt = now, lastAt = now }
        receivedBursts[key] = state
        C_Timer.After(BURST_SUMMARY_DELAY, function()
            receivedBursts[key] = nil
            log.Check(state.received == state.expected, "BURST", id, "de", sender, "via", channel, ":",
                state.received, "/", state.expected, string.format("reçus en %.1f s", state.lastAt - state.firstAt))
        end)
    end
    state.received = state.received + 1
    state.lastAt = GetTime()
end

local HANDLERS = { PING = onPing, PONG = onPong, SIZE = onSize, BURST = onBurst }

local function onAddonMessage(prefix, text, channel, sender)
    if Util.IsSecret(prefix) or Util.IsSecret(text) then
        log.Trace("message addon au contenu secret reçu via", channel)
        return
    end
    if prefix ~= PREFIX then
        return
    end
    local kind, first, second, third = strsplit(SEPARATOR, text)
    local handler = HANDLERS[kind]
    if handler then
        handler(sender, channel, text, first, second, third)
    end
end

ns.Registry.Register({
    id = "comm",
    description = "communication entre addons (canaux, taille, débit)",
    Setup = function()
        local accepted, result = interpretResult("RegisterAddonMessagePrefixResult",
            Compat.RegisterAddonMessagePrefix(PREFIX))
        log.Check(accepted, "préfixe", PREFIX, "enregistré :", result)
        if not ns.Events.On("CHAT_MSG_ADDON", onAddonMessage) then
            log.Fail("événement CHAT_MSG_ADDON refusé")
        end
    end,
    commands = {
        { name = "ping", usage = "[CANAL]", run = ping },
        { name = "size", usage = "[CANAL]", run = size },
        { name = "burst", usage = "[CANAL] [nombre]", run = burst },
    },
})
