local _, ns = ...

--- T6: deaths and resurrections without the combat log (forbidden): the player's own events,
--- and the dead state of every group member read once per second.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("deaths")

local POLL_SECONDS = 1

-- Unit -> last dead state seen. Reset when the group changes, because unit tokens move.
local deadByUnit = {}
local secretReported = false
local ticker

local function groupUnits()
    local units = {}
    if IsInRaid() then
        for index = 1, GetNumGroupMembers() do
            units[#units + 1] = "raid" .. index
        end
        return units
    end
    units[1] = "player"
    for index = 1, GetNumGroupMembers() - 1 do
        units[#units + 1] = "party" .. index
    end
    return units
end

local function poll()
    for _, unit in ipairs(groupUnits()) do
        local isDead = UnitIsDeadOrGhost(unit)
        if Util.IsSecret(isDead) then
            if not secretReported then
                secretReported = true
                log.Fail("état de mort secret (" .. unit .. ") : morts du groupe illisibles ici")
            end
        else
            local wasDead = deadByUnit[unit]
            deadByUnit[unit] = isDead
            if wasDead ~= nil and wasDead ~= isDead then
                local _, name = Compat.GetUnitName(unit, true)
                log.Ok(isDead and "mort :" or "relevé :", name, "(" .. unit .. ")")
            end
        end
    end
end

local function toggleWatch()
    if ticker then
        ticker:Cancel()
        ticker = nil
        log.Info("surveillance du groupe arrêtée")
        return
    end
    deadByUnit, secretReported = {}, false
    ticker = C_Timer.NewTicker(POLL_SECONDS, poll)
    log.Info("surveillance du groupe lancée : morts et relevés journalisés, retaper la commande pour arrêter")
end

ns.Registry.Register({
    id = "deaths",
    description = "morts et résurrections (écoute passive du joueur, surveillance du groupe)",
    Setup = function()
        log.Journal({ PLAYER_DEAD = "Ok", PLAYER_ALIVE = "Info", PLAYER_UNGHOST = "Info", RESURRECT_REQUEST = "Ok" })
        log.Listen("GROUP_ROSTER_UPDATE", function()
            deadByUnit = {}
        end)
    end,
    commands = {
        { name = "watch", run = toggleWatch },
    },
})
