local _, ns = ...

--- Messages between the addons of the guild: data of any size, cut into pieces of 255 bytes at most, numbered,
--- put back together on arrival, then handed to the handlers of their kind.
local Comm = {}
ns.Comm = Comm

local Compat, Names, SendQueue, Serializer, Util = ns.Compat, ns.Names, ns.SendQueue, ns.Serializer, ns.Util
local Call, Events = ns.Call, ns.Events

local PREFIX = "VXV"
--- Messages of another protocol version are ignored; the presence announces tell when to update.
local PROTOCOL = 1
local SEPARATOR = "\031"
local MAX_MESSAGE_BYTES = 255
-- Two digits for the piece numbers: data up to about 20 KB, far above what VXV sends.
local MAX_PIECES = 99
local PIECE_NUMBER_WIDTH = 2
local REASSEMBLY_TIMEOUT_SECONDS = 60
local HEADER_PATTERN = "^(%d+)\031([^\031]+)\031(%d+)\031(%d+)\031([^\031]+)\031(.*)$"

local handlers = {}
local incomplete = {}
local session = string.format("%x", time() % 65536)
local lastMessageNumber = 0

local function header(id, piece, total, kind)
    return table.concat({ PROTOCOL, id, piece, total, kind, "" }, SEPARATOR)
end

local function dispatch(kind, payload, sender, channel)
    for _, handler in ipairs(handlers[kind] or {}) do
        Call.Isolated(handler, payload, sender, channel)
    end
end

local function send(kind, payload, channel, target)
    local body = Serializer.Encode(payload)
    lastMessageNumber = lastMessageNumber + 1
    local id = session .. lastMessageNumber
    local room = MAX_MESSAGE_BYTES - #header(id, MAX_PIECES, MAX_PIECES, kind)
    local total = math.max(1, math.ceil(#body / room))
    assert(total <= MAX_PIECES, "VXV: data too large to send")
    for piece = 1, total do
        local text = header(id, string.format("%0" .. PIECE_NUMBER_WIDTH .. "d", piece), total, kind)
            .. body:sub((piece - 1) * room + 1, piece * room)
        SendQueue.Push(PREFIX, text, channel, target)
    end
end

--- Calls the handler with (payload, sender, channel) for every message of this kind.
function Comm.On(kind, handler)
    local list = handlers[kind] or {}
    list[#list + 1] = handler
    handlers[kind] = list
end

--- Sends the data to the guild (or to the raid or the group), and hands it to this player's handlers too:
--- every member, the sender included, sees the same data.
function Comm.Broadcast(kind, payload, channel)
    send(kind, payload, channel or "GUILD")
    dispatch(kind, payload, Names.OfUnit("player"), channel or "GUILD")
end

--- Sends the data to one player, named "Prénom Nom".
function Comm.Whisper(kind, payload, target)
    send(kind, payload, "WHISPER", target)
end

local function forgetStale(now)
    for key, entry in pairs(incomplete) do
        if now - entry.startedAt > REASSEMBLY_TIMEOUT_SECONDS then
            incomplete[key] = nil
        end
    end
end

local function receive(prefix, text, channel, sender)
    if Util.IsSecret(prefix) or prefix ~= PREFIX or Util.IsSecret(text) or Util.IsSecret(sender) then
        return
    end
    -- The raid sends our own messages back to us: they were already handed over when sent.
    if sender == Names.OfUnit("player") then
        return
    end
    local protocol, id, piece, total, kind, chunk = text:match(HEADER_PATTERN)
    if tonumber(protocol) ~= PROTOCOL then
        return
    end
    local now = GetTime()
    forgetStale(now)
    local key = sender .. SEPARATOR .. id
    local entry = incomplete[key] or { startedAt = now, pieces = {}, received = 0 }
    incomplete[key] = entry
    piece, total = tonumber(piece), tonumber(total)
    if entry.pieces[piece] == nil then
        entry.pieces[piece] = chunk
        entry.received = entry.received + 1
    end
    if entry.received < total then
        return
    end
    incomplete[key] = nil
    local payload = Serializer.Decode(table.concat(entry.pieces, "", 1, total))
    if payload ~= nil then
        dispatch(kind, payload, sender, channel)
    end
end

--- Listens to the guild's addons; called once the player is in the world.
function Comm.Start()
    Compat.RegisterAddonMessagePrefix(PREFIX)
    Events.On("CHAT_MSG_ADDON", receive)
    Events.On("ENCOUNTER_END", SendQueue.Flush)
end
