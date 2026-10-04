local _, ns = ...

--- The event's soft reserves by item: who reserved it, with their SR+ bonus.
local Reserves = {}
ns.Reserves = Reserves

local function byBonusThenName(left, right)
    if left.bonus ~= right.bonus then
        return left.bonus > right.bonus
    end
    return left.signup.name < right.signup.name
end

--- Item id -> reservers { signup, bonus }, highest bonus first, then by name.
function Reserves.ByItem(event)
    local byItem = {}
    for _, signup in ipairs(event.signups) do
        for _, reserve in ipairs(signup.reserves) do
            local list = byItem[reserve.itemId] or {}
            list[#list + 1] = { signup = signup, bonus = reserve.bonus }
            byItem[reserve.itemId] = list
        end
    end
    for _, list in pairs(byItem) do
        table.sort(list, byBonusThenName)
    end
    return byItem
end

--- Reservers of one item, possibly none.
function Reserves.For(event, itemId)
    return Reserves.ByItem(event)[itemId] or {}
end
