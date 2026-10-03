local _, ns = ...

--- T4: reading and sending messages in the raid channel (party and guild for comparison).
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("chat")

local TEST_MARKER = "[VXV test]"
local READ_EVENTS = {
    "CHAT_MSG_RAID", "CHAT_MSG_RAID_LEADER", "CHAT_MSG_RAID_WARNING",
    "CHAT_MSG_PARTY", "CHAT_MSG_PARTY_LEADER", "CHAT_MSG_GUILD",
}

local function defaultChannel()
    return IsInRaid() and "RAID" or "PARTY"
end

local function send(args)
    local channelArg = Util.SplitFirst(args)
    local channel = channelArg ~= "" and channelArg:upper() or defaultChannel()
    local text = TEST_MARKER .. " message envoyé par l'addon à " .. date("%H:%M:%S")
    log.Call("SendChatMessage sur " .. channel, Compat.SendChatMessage(text, channel))
end

--- Every message is kept in the report; the test messages, sent by this probe on any client, are printed.
local function onMessage(event)
    return function(text, sender)
        local isTestMessage = not Util.IsSecret(text) and text:find(TEST_MARKER, 1, true) ~= nil
        local logMessage = isTestMessage and log.Ok or log.Trace
        logMessage(event, "lu, de", sender, ":", text)
    end
end

ns.Registry.Register({
    id = "chat",
    description = "lecture (écoute passive) et envoi de messages dans le canal raid",
    Setup = function()
        for _, event in ipairs(READ_EVENTS) do
            log.Listen(event, onMessage(event))
        end
    end,
    commands = {
        { name = "send", usage = "[RAID | RAID_WARNING | PARTY | GUILD]", run = send },
    },
})
