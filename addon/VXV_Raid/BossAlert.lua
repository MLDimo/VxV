local _, ns = ...

--- The alert « Tu as une SR sur le prochain boss » (P8.3): a message in the middle of the screen and the raid warning's
--- sound, once per boss of the event, when the player stands in the raid's instance and reserved one of the next
--- boss's items. The player turns it off or on again (/vxv alerte, or the Raid screen).
local BossAlert = {}
ns.BossAlert = BossAlert

local AlertFrame, NextBoss, RaidData, RaidLog = ns.AlertFrame, ns.NextBoss, ns.RaidData, ns.RaidLog

-- Entering an instance fires no event measured on Forever: where the player stands is read this often.
local CHECK_EVERY_SECONDS = 5
-- The game's raid warning (SOUNDKIT.RAID_WARNING).
local RAID_WARNING_SOUND = 8959
local ON = "Alerte du prochain boss activée : un message et un son quand tu as une SR sur le prochain boss."
local OFF = "Alerte du prochain boss désactivée (/vxv alerte pour la remettre)."

local saved = { alerted = {} }
-- The raid whose instance the player stands in, as last seen: the screens follow its changes ("raid.place").
local place

--- Takes the module's saved data at start-up: whether the alert is off, and the bosses already announced.
function BossAlert.Restore(data)
    saved = data
    saved.alerted = type(saved.alerted) == "table" and saved.alerted or {}
end

function BossAlert.IsOn()
    return not saved.alertOff
end

function BossAlert.Toggle()
    saved.alertOff = not saved.alertOff
    VXV.Print(saved.alertOff and OFF or ON)
    VXV.Emit("raid.alert")
end

--- Announces the next boss when the player reserved one of its items, once per boss of the event (a /reload
--- included); only the current event's announced bosses are kept.
local function check()
    local event = RaidData.Current()
    if saved.alertOff or event == nil then
        return
    end
    local log = RaidLog.Current()
    local found = NextBoss.Find(event, log and log.kills or {})
    local here = found ~= nil and found.here and found.raid or nil
    if here ~= place then
        place = here
        VXV.Emit("raid.place")
    end
    if here == nil or found.boss == nil then
        return
    end
    local warning = NextBoss.Warning(event, VXV.PlayerName(), found.boss)
    local announced = saved.alerted[event.id] or {}
    if warning == nil or announced[found.boss.encounterId] then
        return
    end
    announced[found.boss.encounterId] = true
    saved.alerted = { [event.id] = announced }
    AlertFrame.Show(warning.title, warning.text)
    VXV.Compat.PlaySound(RAID_WARNING_SOUND)
end

local function checkAgain()
    check()
    C_Timer.After(CHECK_EVERY_SECONDS, checkAgain)
end

--- From login on: now, then every few seconds and at each kill.
function BossAlert.Start()
    checkAgain()
end

VXV.On("raid.log", check)
VXV.On("raid.updated", check)
VXV.RegisterCommand("alerte", "activer ou désactiver l'alerte du prochain boss", BossAlert.Toggle)
