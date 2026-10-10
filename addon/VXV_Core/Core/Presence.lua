local _, ns = ...

--- Who is connected with VXV, and with which version: each addon announces itself to the guild at login and
--- answers the others' announces privately. A member running an older version sees it under the Taverne, not in the
--- chat; so does one whose companion is newer than the addon ("presence.outdated").
local Presence = {}
ns.Presence = Presence

local Bus, Comm, Names = ns.Bus, ns.Comm, ns.Names

local HELLO = "hello"

local versions = {}
local outdated = false

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
    outdated = outdated or Presence.IsNewer(payload.version, ns.VERSION)
    if not payload.reply and sender ~= Names.OfUnit("player") then
        Comm.Whisper(HELLO, { version = ns.VERSION, reply = true }, sender)
    end
    Bus.Emit("presence.changed")
end)

Bus.On("presence.outdated", function()
    outdated = true
    Bus.Emit("presence.changed")
end)

--- True when a newer version of the addon exists: another member runs it, or the companion expects it.
function Presence.Outdated()
    return outdated
end

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
