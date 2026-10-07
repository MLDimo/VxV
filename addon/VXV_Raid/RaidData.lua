local _, ns = ...

--- The event shown in the Raid tab (VXV-RAID-3, EventData.lua): brought by the companion, loaded by an officer from
--- the website's text, passed on to the guild by the officers, kept in the saved data with who sent it (the core's
--- site data). The text names the officers; only their characters may send it.
local EventData, Labels = ns.EventData, ns.Labels

local LOADED = "Données chargées : %s, le %s."
-- The website locks soft reserves 30 minutes before the raid.
local LOCK_BEFORE_START_SECONDS = 30 * 60

local store = VXV.SiteData({
    name = "raid",
    header = EventData.FORMAT.header,
    wrong = EventData.FORMAT.wrong,
    New = EventData.FORMAT.New,
    lines = EventData.FORMAT.lines,
})

local RaidData = {}
ns.RaidData = RaidData
for name, run in pairs(store) do
    RaidData[name] = run
end

--- When the event's soft reserves lock (Unix seconds).
function RaidData.LockAt(event)
    return event.startsAt - LOCK_BEFORE_START_SECONDS
end

--- An officer pastes the website's text: kept and passed on to the guild; true and a message, or false and why.
function RaidData.Import(text)
    local ok, refusal = store.Import(text)
    if not ok then
        return false, refusal
    end
    local event = store.Current()
    return true, LOADED:format(event.title, Labels.DateTime(event.startsAt))
end
