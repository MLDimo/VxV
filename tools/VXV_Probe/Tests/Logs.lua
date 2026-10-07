local _, ns = ...

--- T11 (7 October): can the addon reach the companion without /reload, through the files the game writes while it
--- runs? The combat log (Logs/WoWCombatLog*.txt, raid events read live, healing received included?) and the chat log
--- (Logs/WoWChatLog.txt: which of our messages land there, how soon, and hidden from the chat frames?). The files are
--- read on disk while the game runs; this test switches the logs on, sends marked messages by every means, and
--- journals what the client allowed. "/vxvtest later journaux ..." runs a command outside the player's keypress,
--- as the real addon would.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("journaux")

local MARKER = "VXVSONDE"
local CHANNEL = "VxvSonde"
local CHANNEL_PASSWORD = "vxv"
-- The probe's addon prefix, registered by the comm test.
local ADDON_PREFIX = "VXVProbe"
-- Messages of the channel holding this tag are hidden from the chat frames by a filter: are they still logged?
local HIDDEN_TAG = "cache"
local BURST_COUNT = 10
local MAX_CHAT_BYTES = 255
local FILLER = "x"
local ADVANCED_COMBAT_LOGGING = "advancedCombatLogging"
local MISSING_API = "API absente"
-- The system's answers to a send (a whisper to an unknown name…) are journaled for this long after it.
local ANSWER_SECONDS = 10

local answersUntil = 0

local function isMarked(text)
    return not Util.IsSecret(text) and type(text) == "string" and text:find(MARKER, 1, true) ~= nil
end

local function describe(ok, ...)
    if not ok then
        return "erreur : " .. Util.Safe((...))
    end
    return Util.Join("renvoie", ...)
end

--- The state of both logs and of the advanced combat logging, as the client tells it.
local function states()
    log.Info("journal de combat (LoggingCombat()) :", describe(Compat.LoggingCombat()))
    log.Info("journal du chat (LoggingChat()) :", describe(Compat.LoggingChat()))
    log.Info("CVar", ADVANCED_COMBAT_LOGGING, ":", describe(Compat.GetCVar(ADVANCED_COMBAT_LOGGING)))
    log.Info("canal", CHANNEL, "(GetChannelName) :", describe(Compat.GetChannelName(CHANNEL)))
end

local function start()
    states()
    log.Call("LoggingCombat(true)", Compat.LoggingCombat(true))
    log.Call("SetCVar(" .. ADVANCED_COMBAT_LOGGING .. ", 1)", Compat.SetCVar(ADVANCED_COMBAT_LOGGING, "1"))
    log.Call("LoggingChat(true)", Compat.LoggingChat(true))
    log.Call("JoinChannelByName(" .. CHANNEL .. ")", Compat.JoinChannelByName(CHANNEL, CHANNEL_PASSWORD))
    states()
    log.Info("à faire : combattre un monstre en recevant des soins, puis /vxvtest later journaux send")
end

--- "Prénom Nom", then "Prénom-Nom": which one a whisper to oneself accepts.
local function ownNames()
    local ok, fullName = Compat.GetUnitName("player", true)
    if not ok or Util.IsSecret(fullName) or type(fullName) ~= "string" then
        return {}
    end
    return { fullName, (fullName:gsub(" ", "-", 1)) }
end

local function channelIndex()
    local ok, index = Compat.GetChannelName(CHANNEL)
    return ok and type(index) == "number" and index > 0 and index or nil
end

local function sendChat(label, text, chatType, target)
    log.Call(Util.Join("SendChatMessage", chatType, label), Compat.SendChatMessage(text, chatType, nil, target))
end

--- Sends a marked message by every means; the id ties the log file's lines to this journal.
local function send()
    local id = tostring(time())
    local function marked(kind)
        return Util.Join(MARKER, id, kind)
    end
    log.Info("envoi des messages marqués", MARKER, id, "à", Util.FormatTime(time()))
    answersUntil = GetTime() + ANSWER_SECONDS
    print(marked("affichage"))
    log.Call("SendAddonMessage WHISPER à soi", Compat.SendAddonMessage(ADDON_PREFIX, marked("addon-chuchote"),
        "WHISPER", ownNames()[1]))
    log.Call("SendAddonMessage GUILD", Compat.SendAddonMessage(ADDON_PREFIX, marked("addon-guilde"), "GUILD"))
    for _, name in ipairs(ownNames()) do
        sendChat("à " .. name, marked("chuchote " .. name), "WHISPER", name)
    end
    local index = channelIndex()
    if index == nil then
        log.Fail("canal", CHANNEL, "absent : /vxvtest journaux start d'abord")
        return
    end
    sendChat("canal", marked("canal"), "CHANNEL", index)
    sendChat("canal caché", marked("canal " .. HIDDEN_TAG), "CHANNEL", index)
    local long = marked("long ")
    sendChat("canal 255 octets", long .. FILLER:rep(MAX_CHAT_BYTES - #long), "CHANNEL", index)
    for number = 1, BURST_COUNT do
        sendChat("canal rafale " .. number, marked("rafale " .. number), "CHANNEL", index)
    end
end

local function stop()
    log.Call("LeaveChannelByName(" .. CHANNEL .. ")", Compat.LeaveChannelByName(CHANNEL))
    log.Call("LoggingChat(false)", Compat.LoggingChat(false))
    log.Call("LoggingCombat(false)", Compat.LoggingCombat(false))
    states()
end

--- Hides the channel's messages holding the tag from every chat frame.
local function hideTagged(_, _, text)
    return isMarked(text) and text:find(HIDDEN_TAG, 1, true) ~= nil
end

--- Every received message holding the marker goes to the journal, with the channel's notices and the system's
--- answers just after a send.
local function onMessage(event)
    return function(text, sender, ...)
        if isMarked(text) or event == "CHAT_MSG_CHANNEL_NOTICE" then
            log.Ok(event, "reçu de", sender, ":", text, ...)
        elseif event == "CHAT_MSG_SYSTEM" and GetTime() <= answersUntil then
            log.Info(event, ":", text)
        end
    end
end

local function onAddonMessage(prefix, text, channel, sender)
    if prefix == ADDON_PREFIX and isMarked(text) then
        log.Ok("CHAT_MSG_ADDON reçu sur", channel, "de", sender, ":", text)
    end
end

local LISTENED = {
    "CHAT_MSG_CHANNEL", "CHAT_MSG_CHANNEL_NOTICE", "CHAT_MSG_WHISPER", "CHAT_MSG_WHISPER_INFORM", "CHAT_MSG_SYSTEM",
}

ns.Registry.Register({
    id = "journaux",
    description = "journal de combat et journal du chat écrits pendant la partie (vers le compagnon sans /reload)",
    Setup = function()
        for _, event in ipairs(LISTENED) do
            log.Listen(event, onMessage(event))
        end
        log.Listen("CHAT_MSG_ADDON", onAddonMessage)
        local ok, problem = Compat.AddMessageEventFilter("CHAT_MSG_CHANNEL", hideTagged)
        if not ok and problem ~= MISSING_API then
            log.Fail("filtre du canal :", Util.Safe(problem))
        end
    end,
    commands = {
        { name = "start", run = start },
        { name = "send", run = send },
        { name = "state", run = states },
        { name = "stop", run = stop },
    },
})
