local _, ns = ...

--- What the loot panel shows: each item the boss dropped, with the soft reserves set on it. Built from data alone.
local LootView = {}
ns.LootView = LootView

local Labels, Reserves = ns.Labels, ns.Reserves

local GREY = "|cff808080%s (absent)|r"

local function reservedBy(reservers, inGroup)
    local names = {}
    for _, reserver in ipairs(reservers) do
        local signup = reserver.signup
        if inGroup[signup.name] then
            names[#names + 1] = Labels.Colored(signup.name, signup.class) .. (reserver.bonus > 0 and (" +" ..
                reserver.bonus) or "")
        else
            names[#names + 1] = GREY:format(signup.name)
        end
    end
    return "SR de " .. table.concat(names, ", ")
end

local function status(event, item, inGroup)
    if event == nil then
        return "pas de données de raid"
    end
    local data = event.items[item.itemId]
    if data ~= nil and data.excluded then
        return "exclu des SR (loot council)"
    end
    local reservers = Reserves.For(event, item.itemId)
    return #reservers > 0 and reservedBy(reservers, inGroup) or "aucune SR, roll libre"
end

--- Rows of the loot panel; inGroup holds the names of the group's members.
function LootView.Rows(drop, event, inGroup)
    local rows = { { kind = "title", text = "Butin de " .. drop.boss } }
    if event == nil then
        rows[#rows + 1] = { kind = "line", text = "Pas de données de raid : un officier les charge (/vxv importer)." }
    end
    for _, item in ipairs(drop.items) do
        rows[#rows + 1] = { kind = "line", text = item.link .. " : " .. status(event, item, inGroup), link = item.link }
    end
    return rows
end
