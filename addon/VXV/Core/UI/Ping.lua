local ns = select(2, ...).Core

--- /vxv ping: every member connected with VXV answers. Proves that data sent by one reaches all the others.
local Chat, Comm, Names, Slash = ns.Chat, ns.Comm, ns.Names, ns.Slash

local PING, PONG = "ping", "pong"
local MS_PER_SECOND = 1000

local sentAt = {}
local lastPing = 0

Comm.On(PING, function(payload, sender)
    if type(payload) == "table" and sender ~= nil and sender ~= Names.OfUnit("player") then
        Comm.Whisper(PONG, { ping = payload.ping }, sender)
    end
end)

Comm.On(PONG, function(payload, sender)
    local startedAt = type(payload) == "table" and sentAt[payload.ping]
    if startedAt then
        local delay = math.floor((GetTime() - startedAt) * MS_PER_SECOND)
        Chat.Print(string.format("%s a répondu (%d ms)", sender, delay))
    end
end)

Slash.Register("ping", "vérifier qui reçoit les messages de VXV", function()
    lastPing = lastPing + 1
    sentAt[lastPing] = GetTime()
    Comm.Broadcast(PING, { ping = lastPing })
    Chat.Print("Ping envoyé à la guilde : chaque membre connecté avec VXV va répondre.")
end)
