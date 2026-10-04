local _, ns = ...

--- Who is connected with VXV, and with which version: each addon announces itself to the guild at login and
--- answers the others' announces privately. A member running an older version is told to update, once.
local Presence = {}
ns.Presence = Presence

local Bus, Chat, Comm, Names = ns.Bus, ns.Chat, ns.Comm, ns.Names

local HELLO = "hello"
local UPDATE_NOTICE = "Une nouvelle version de VXV existe (%s) : mets l'addon à jour pour profiter de tout."

local versions = {}
local updateNoticeShown = false

--- Major, minor and patch numbers of a version such as "1.2.0-beta.1", and whether it is a pre-release.
local function parse(version)
    local major, minor, patch, rest = tostring(version):match("^(%d+)%.(%d+)%.(%d+)(.*)$")
    if major == nil then
        return nil
    end
    return { tonumber(major), tonumber(minor), tonumber(patch), preRelease = rest ~= "" }
end

--- True when the other version is newer than this one; development builds never ask anybody to update.
function Presence.IsNewer(other, mine)
    local theirs, ours = parse(other), parse(mine)
    if theirs == nil or ours == nil then
        return false
    end
    for index = 1, 3 do
        if theirs[index] ~= ours[index] then
            return theirs[index] > ours[index]
        end
    end
    return ours.preRelease and not theirs.preRelease
end

Comm.On(HELLO, function(payload, sender)
    if type(payload) ~= "table" or sender == nil then
        return
    end
    versions[sender] = tostring(payload.version)
    if not updateNoticeShown and Presence.IsNewer(payload.version, ns.VERSION) then
        updateNoticeShown = true
        Chat.Print(UPDATE_NOTICE:format(tostring(payload.version)))
    end
    if not payload.reply and sender ~= Names.OfUnit("player") then
        Comm.Whisper(HELLO, { version = ns.VERSION, reply = true }, sender)
    end
    Bus.Emit("presence.changed")
end)

--- Tells the guild this player is connected with VXV.
function Presence.Announce()
    Comm.Broadcast(HELLO, { version = ns.VERSION })
end

--- Names of the members connected with VXV, this player included, in alphabetical order.
function Presence.Online()
    local names = {}
    for name in pairs(versions) do
        names[#names + 1] = name
    end
    table.sort(names)
    return names
end
