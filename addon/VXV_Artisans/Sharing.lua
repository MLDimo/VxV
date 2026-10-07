local _, ns = ...

--- The professions travel in the guild (P14.2): each addon tells its own characters' professions when they change,
--- and at login the list of those it holds; an addon that misses one asks its owner, who whispers it. An officer
--- with the companion takes what they hear to the website, for the members without one.
local Sharing = {}
ns.Sharing = Sharing

local ArtisansData, Directory, Website = ns.ArtisansData, ns.Directory, ns.Website

local PROFESSION, INDEX, ASK = "artisans.profession", "artisans.index", "artisans.ask"

local function payloadOf(entry)
    return { c = entry.character, k = entry.class, p = entry.id, n = entry.name, l = entry.level, m = entry.max,
        at = entry.readAt, ra = entry.recipesAt, r = entry.recipes }
end

local function entryOf(payload)
    if type(payload) ~= "table" or type(payload.c) ~= "string" or type(payload.p) ~= "number"
        or type(payload.n) ~= "string" or type(payload.l) ~= "number" or type(payload.m) ~= "number"
        or type(payload.at) ~= "number" then
        return nil
    end
    local recipes
    if type(payload.r) == "table" and type(payload.ra) == "number" then
        recipes = {}
        for id, name in pairs(payload.r) do
            if type(id) == "number" and type(name) == "string" then
                recipes[id] = name
            end
        end
    end
    return { character = payload.c, class = type(payload.k) == "string" and payload.k or nil, id = payload.p,
        name = payload.n, level = payload.l, max = payload.m, readAt = payload.at, recipesAt = recipes and payload.ra,
        recipes = recipes }
end

--- What this addon holds of its own characters: { c, p, at, ra } each.
local function index(ask)
    local list = {}
    for _, entry in ipairs(Directory.Mine()) do
        list[#list + 1] = { c = entry.character, p = entry.id, at = entry.readAt, ra = entry.recipesAt or 0 }
    end
    return { e = list, ask = ask }
end

VXV.OnMessage(INDEX, function(payload, sender)
    if type(payload) ~= "table" or type(payload.e) ~= "table" or sender == VXV.PlayerName() then
        return
    end
    for _, item in ipairs(payload.e) do
        if type(item) == "table" and Directory.IsNewer(item.c, item.p, item.at, item.ra) then
            VXV.Whisper(ASK, { c = item.c, p = item.p }, sender)
        end
    end
    if payload.ask == true then
        VXV.Whisper(INDEX, index(false), sender)
    end
end)

VXV.OnMessage(ASK, function(payload, sender)
    local entry = type(payload) == "table" and Directory.Own(payload.c, payload.p)
    if entry then
        VXV.Whisper(PROFESSION, payloadOf(entry), sender)
    end
end)

VXV.OnMessage(PROFESSION, function(payload, sender)
    local entry = entryOf(payload)
    local me = VXV.PlayerName()
    if entry == nil or sender == me or not Directory.Hear(entry) then
        return
    end
    if VXV.CompanionSeen() and ArtisansData.IsOfficer(me) then
        Website.Send(entry.character)
    end
end)

-- The player's own professions, told to the guild when they change.
VXV.On("artisans.own", function(entry)
    VXV.Broadcast(PROFESSION, payloadOf(entry))
end)

--- Tells the guild, once the player is in the world, what this addon holds, and asks for what the others hold.
function Sharing.Start()
    VXV.Broadcast(INDEX, index(true))
end
