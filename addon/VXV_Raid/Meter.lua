local _, ns = ...

--- The game's damage meter (phase 0, T7) read after each boss killed: every member's damage and healing on the
--- encounter, added to the raid's log for the titles (P13). The meter keeps one session per combat, readable out of
--- combat only, and hides the names of the players who left the group: the boss's session is noted at the kill, and
--- read at the first second out of combat.
local Group, RaidLog = ns.Group, ns.RaidLog

local READ_RETRY_SECONDS = 1
-- Enum.DamageMeterType, measured on 3 October.
local DAMAGE_DONE, HEALING_DONE = 0, 2

-- The kills whose session waits to be read: { eventId, sessionId }.
local waiting = {}

--- The latest combat session, the boss's at its kill: the sessions' ids stay readable in combat.
local function latestSession()
    local ok, sessions = VXV.Compat.GetAvailableCombatSessions()
    local latest
    for _, session in pairs(ok and type(sessions) == "table" and sessions or {}) do
        local id = type(session) == "table" and session.sessionID
        if not VXV.IsSecret(id) and type(id) == "number" and (latest == nil or id > latest) then
            latest = id
        end
    end
    return latest
end

--- The amount of each group member in the session, by name; the unreadable ones are left out.
local function amounts(sessionId, meterType, members)
    local found = {}
    local ok, session = VXV.Compat.GetCombatSessionFromID(sessionId, meterType)
    if not ok or type(session) ~= "table" or type(session.combatSources) ~= "table" then
        return found
    end
    for _, source in ipairs(session.combatSources) do
        local name, amount = source.name, source.totalAmount
        if not VXV.IsSecret(name) and not VXV.IsSecret(amount) and type(amount) == "number" and members[name] then
            found[name] = math.floor(amount)
        end
    end
    return found
end

local function readWaiting()
    if InCombatLockdown() then
        C_Timer.After(READ_RETRY_SECONDS, readWaiting)
        return
    end
    local members = Group.Names()
    for _, kill in ipairs(waiting) do
        local damage = amounts(kill.sessionId, DAMAGE_DONE, members)
        local healing = amounts(kill.sessionId, HEALING_DONE, members)
        local readings = {}
        for name in pairs(members) do
            if damage[name] ~= nil or healing[name] ~= nil then
                readings[name] = { damage = damage[name] or 0, healing = healing[name] or 0 }
            end
        end
        RaidLog.AddMeter(kill.eventId, readings)
    end
    waiting = {}
end

VXV.OnEvent("ENCOUNTER_END", function(_, _, _, _, success)
    local log = RaidLog.Current()
    local sessionId = log ~= nil and (success == 1 or success == true) and latestSession()
    if not sessionId then
        return
    end
    waiting[#waiting + 1] = { eventId = log.eventId, sessionId = sessionId }
    if #waiting == 1 then
        C_Timer.After(READ_RETRY_SECONDS, readWaiting)
    end
end)
