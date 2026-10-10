local _, ns = ...

--- The rules of attribution (plan 6.3), from the event's data and the group alone. An item excluded from soft
--- reserves goes to the loot council; a single reserver in the group gets it without a roll; several reservers roll
--- among themselves, with their SR+ bonus; without a reserver in the group, everybody rolls. Reservers absent from
--- the group are left out, and so are, from a free roll, the players whose class may not equip the item. Rolls are
--- 1-100, one per player; a tie is rolled again between the tied players.
local Attribution = {}
ns.Attribution = Attribution

local Reserves = ns.Reserves

local ROLL_MIN, ROLL_MAX = 1, 100

--- How the item is given: { mode = "council" | "direct" | "reserved" | "free", reservers = { { name, bonus } } },
--- the reservers being those in the group, highest bonus first.
function Attribution.Plan(event, itemId, inGroup)
    local item = event and event.items[itemId]
    if item ~= nil and item.excluded then
        return { mode = "council", reservers = {} }
    end
    local present = {}
    for _, reserver in ipairs(event and Reserves.For(event, itemId) or {}) do
        if inGroup[reserver.signup.name] then
            present[#present + 1] = { name = reserver.signup.name, bonus = reserver.bonus }
        end
    end
    local modes = { [0] = "free", [1] = "direct" }
    return { mode = modes[#present] or "reserved", reservers = present }
end

--- Whether the roll counts in the round, or why not. The round holds bonuses (name -> SR+ bonus) of the players
--- allowed to roll, or nil when every member of the group may; inGroup; unfit, the members whose class may not equip
--- the item; and rolled, who rolled already.
function Attribution.Judge(round, roll)
    if roll.low ~= ROLL_MIN or roll.high ~= ROLL_MAX then
        return false, "pas 1-100"
    end
    if round.rolled[roll.name] then
        return false, "déjà roll"
    end
    if round.bonuses ~= nil and round.bonuses[roll.name] == nil then
        return false, "pas de SR"
    end
    if round.bonuses == nil and not round.inGroup[roll.name] then
        return false, "hors du groupe"
    end
    if round.bonuses == nil and round.unfit[roll.name] then
        return false, "ne peut pas l'équiper"
    end
    return true
end

--- The roll plus the player's SR+ bonus in this round.
function Attribution.Total(round, roll)
    return roll.roll + (round.bonuses and round.bonuses[roll.name] or 0)
end

--- Names of the players with the best total among the valid rolls (several on a tie), and that total.
function Attribution.Best(round, rolls)
    local best, names = nil, {}
    for _, roll in ipairs(rolls) do
        if roll.valid then
            local total = Attribution.Total(round, roll)
            if best == nil or total > best then
                best, names = total, { roll.name }
            elseif total == best then
                names[#names + 1] = roll.name
            end
        end
    end
    return names, best
end

--- The loot method recorded for a winner: soft reserve (with SR+ when a bonus counted), free roll, loot council.
function Attribution.Method(mode, bonus)
    if mode == "council" then
        return "loot_council"
    elseif mode == "free" then
        return "free_roll"
    end
    return (bonus or 0) > 0 and "soft_reserve_plus" or "soft_reserve"
end
