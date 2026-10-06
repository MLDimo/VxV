local _, ns = ...

--- T7: the game's own damage and healing meter (C_DamageMeter, Midnight era) read by the addon.
--- If it is absent or unreadable, the damage and healing titles are dropped.
local Util = ns.Util
local log = ns.Log.For("meter")

local METER_TYPES = { "DamageDone", "HealingDone" }

local function meterApi()
    if type(C_DamageMeter) == "table" then
        return C_DamageMeter
    end
    log.Fail("C_DamageMeter absent : pas de compteur de dégâts lisible")
end

local function list()
    local api = meterApi()
    if not api then
        return
    end
    log.Info("fonctions C_DamageMeter :", table.concat(Util.SortedKeys(api), ", "))
    for name, codes in pairs(Enum) do
        if name:find("DamageMeter", 1, true) then
            log.Info("Enum." .. name, codes)
        end
    end
end

--- Logs one session and each of its combatants (a session is deeper than Util.Safe shows).
local function logSession(label, session)
    log.Ok(label, session)
    if type(session) == "table" and not Util.IsSecret(session) and type(session.combatSources) == "table" then
        for _, source in ipairs(session.combatSources) do
            log.Info("  combattant", source)
        end
    end
end

local function call(api, name, ...)
    if type(api[name]) ~= "function" then
        log.Fail("C_DamageMeter." .. name, "absente (voir /vxvtest meter list)")
        return
    end
    local label = "C_DamageMeter." .. name .. "(" .. Util.Join(...) .. ")"
    local ok, result = pcall(api[name], ...)
    if not ok then
        log.Fail(label, result)
        return
    end
    logSession(label, result)
end

--- The latest session's id, as VXV_Raid notes a boss's session at its kill (P13).
local function latestSessionId(api)
    local ok, sessions = pcall(api.GetAvailableCombatSessions)
    local latest
    for _, session in pairs(ok and type(sessions) == "table" and sessions or {}) do
        local id = type(session) == "table" and session.sessionID
        if not Util.IsSecret(id) and type(id) == "number" and (latest == nil or id > latest) then
            latest = id
        end
    end
    return latest
end

local function read()
    local api = meterApi()
    if not api then
        return
    end
    call(api, "IsDamageMeterAvailable")
    call(api, "GetAvailableCombatSessions")
    local meterTypes, sessionTypes = Enum.DamageMeterType, Enum.DamageMeterSessionType
    if type(meterTypes) ~= "table" or type(sessionTypes) ~= "table" then
        log.Fail("Enum.DamageMeterType ou Enum.DamageMeterSessionType absent (voir /vxvtest meter list)")
        return
    end
    local latest = latestSessionId(api)
    for _, meterTypeName in ipairs(METER_TYPES) do
        for _, sessionType in pairs(sessionTypes) do
            call(api, "GetCombatSessionFromType", sessionType, meterTypes[meterTypeName])
        end
        -- The last combat by its id: VXV_Raid reads each boss this way (P13).
        if latest ~= nil then
            call(api, "GetCombatSessionFromID", latest, meterTypes[meterTypeName])
        end
    end
end

ns.Registry.Register({
    id = "meter",
    description = "compteur de dégâts et de soins intégré au jeu",
    commands = {
        { name = "list", run = list },
        { name = "read", run = read },
    },
})
