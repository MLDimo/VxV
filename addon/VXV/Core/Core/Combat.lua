local ns = select(2, ...).Core

--- What comes on its own to the player's screen or chat (a deathroll's challenge or window, the next boss's alert, a
--- notice) waits for the end of the player's fight (owner's decision of 11 October): only the loot panel shows during
--- one. While something waits, the fight's end is read again each second (PLAYER_REGEN_ENABLED is not measured on
--- WoW Forever).
local Combat = {}
ns.Combat = Combat

local Call = ns.Call

local CHECK_SECONDS = 1

local waiting = {}

local function release()
    if InCombatLockdown() then
        C_Timer.After(CHECK_SECONDS, release)
        return
    end
    local due = waiting
    waiting = {}
    for _, handler in ipairs(due) do
        Call.Isolated(handler)
    end
end

--- Runs the handler now out of a fight, or once the player's fight is over, after those already waiting.
function Combat.After(handler)
    if not InCombatLockdown() and #waiting == 0 then
        handler()
        return
    end
    waiting[#waiting + 1] = handler
    if #waiting == 1 then
        C_Timer.After(CHECK_SECONDS, release)
    end
end
