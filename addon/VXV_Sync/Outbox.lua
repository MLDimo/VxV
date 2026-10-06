local _, ns = ...

--- What the companion takes to the website (P7.4), kept in the saved data VXV_SyncDB: the game writes them at each
--- /reload and logout, the companion reads them then. Filled only when the player has the companion.
--- Contract with the companion (apps/companion/src/domain/outbox.ts):
--- { version = 1, roster = { text = VXV-ROSTER text, capturedAt = Unix seconds },
---   raidLogs = { [event id] = VXV-LOG text }, characters = { ["Prénom Nom"] = { race = token, sex = 2 or 3 } },
---   changes = { [change id] = a change made in game (VXV_Raid/Changes.lua) } }.
--- Other bundles add to it with VXV.Emit("sync.put", kind, key, value); a nil value removes the key.
local Outbox = {}
ns.Outbox = Outbox

local Companion = ns.Companion

local FORMAT_VERSION = 1
--- The kinds of data, each a table of keys, taken to the website.
local KINDS = { "raidLogs", "characters", "changes" }

local db

--- Takes the saved data at ADDON_LOADED (nil at the first installation) and returns them to be saved again.
function Outbox.Load(saved)
    db = type(saved) == "table" and saved or {}
    db.version = FORMAT_VERSION
    for _, kind in ipairs(KINDS) do
        db[kind] = type(db[kind]) == "table" and db[kind] or {}
    end
    return db
end

--- Keeps a value of a kind under its key, for the companion; nil removes it.
function Outbox.Put(kind, key, value)
    if db ~= nil and Companion.IsPresent() and type(db[kind]) == "table" and key ~= nil then
        db[kind][key] = value
    end
end

--- Keeps the guild's roster as the website imports it, with when it was read.
function Outbox.SetRoster(text, capturedAt)
    if db ~= nil and Companion.IsPresent() then
        db.roster = { text = text, capturedAt = capturedAt }
    end
end

--- The roster kept, if any.
function Outbox.Roster()
    return db and db.roster
end

VXV.On("sync.put", Outbox.Put)
