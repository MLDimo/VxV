local _, ns = ...

--- Officers are reminded when their data are older than the soft reserves' lock: the guild should get the
--- final reserves before the raid.
local Freshness = {}
ns.Freshness = Freshness

local Companion, Labels, RaidData = ns.Companion, ns.Labels, ns.RaidData

local CHECK_EVERY_SECONDS = 60
-- The website lists an event 6 hours after its start.
local LISTED_AFTER_START_SECONDS = 6 * 60 * 60
local STALE = "SR verrouillées depuis le %s, mais tes données sont du %s : recopie-les depuis la page de "
    .. "l'événement sur le site (/vxv importer) pour envoyer les SR définitives à la guilde."
local STALE_WITH_COMPANION = "SR verrouillées depuis le %s, mais tes données sont du %s : tape /reload pour "
    .. "charger celles du compagnon et envoyer les SR définitives à la guilde."

local remindedFor

local function check()
    local event = RaidData.Current()
    if event ~= nil and remindedFor ~= event.exportedAt and RaidData.IsOfficer(VXV.PlayerName()) then
        local lockAt, now = RaidData.LockAt(event), time()
        if event.exportedAt < lockAt and now >= lockAt and now < event.startsAt + LISTED_AFTER_START_SECONDS then
            remindedFor = event.exportedAt
            local message = Companion.Seen() and STALE_WITH_COMPANION or STALE
            VXV.Print(message:format(Labels.DateTime(lockAt), Labels.DateTime(event.exportedAt)))
        end
    end
    C_Timer.After(CHECK_EVERY_SECONDS, check)
end

--- Checks now, then every minute: once per data, when they become stale.
function Freshness.Start()
    check()
end
