local _, ns = ...

--- What the Raid tab of the reduced mode shows (§7.8): an alert when the player reserved an item of the next
--- boss, that boss's loot with the soft reserves on each item, and where the raid stands. Built from the data
--- alone.
local CompactView = {}
ns.CompactView = CompactView

local Labels, RaidView, Reserves = ns.Labels, ns.RaidView, ns.Reserves

local Theme = VXV.Theme

local NOT_IN_RAID = "Le prochain boss et son butin s'affichent dans l'instance du raid."
local ALL_DOWN = "Tous les boss sont tombés."

local function bonusText(bonus)
    return bonus > 0 and ("+" .. bonus) or nil
end

--- "SR : Kaelys (toi, +20), Elyra +10", the reservers in their class color; or why nobody reserves the item.
local function reservesText(event, itemId, player)
    local item = event and event.items[itemId]
    if item ~= nil and item.excluded then
        return "Hors SR · loot council"
    end
    local names = {}
    for _, reserver in ipairs(event and Reserves.For(event, itemId) or {}) do
        local signup, bonus = reserver.signup, bonusText(reserver.bonus)
        local name = Labels.Colored(signup.name, signup.class)
        if signup.name == player then
            name = name .. " (toi" .. (bonus and (", " .. bonus) or "") .. ")"
        elseif bonus ~= nil then
            name = name .. " " .. bonus
        end
        names[#names + 1] = name
    end
    return #names > 0 and ("SR : " .. table.concat(names, ", ")) or "Aucune SR · roll libre"
end

--- The player's soft reserves on this boss: { title, text }, or nil.
function CompactView.Alert(event, player, boss)
    if event == nil or boss == nil then
        return nil
    end
    local mine = {}
    for _, item in ipairs(boss.loot) do
        for _, reserver in ipairs(Reserves.For(event, item.itemId)) do
            if reserver.signup.name == player then
                mine[#mine + 1] = item.name .. (reserver.bonus > 0 and (" · SR+ " .. reserver.bonus) or "")
            end
        end
    end
    if #mine == 0 then
        return nil
    end
    return { title = "Tu as une SR sur le prochain boss", text = boss.name .. " · " .. table.concat(mine, " · ") }
end

--- The kicker over the loot, and its rows: one card per item of the next boss; outside the raid's instance, the
--- player's soft reserves.
function CompactView.Loot(event, player, raid, boss)
    if raid == nil then
        local rows = { { kind = "line", text = NOT_IN_RAID }, { kind = "header", text = "Mes SR" } }
        for _, reserve in ipairs(RaidView.MyReserves(event, player)) do
            rows[#rows + 1] = reserve
        end
        return "Prochain boss", rows
    end
    if boss == nil then
        return raid.name, { { kind = "line", text = ALL_DOWN } }
    end
    local rows = {}
    for _, item in ipairs(boss.loot) do
        rows[#rows + 1] = { kind = "card", text = Theme.Colored(item.name, "epic"),
            detail = reservesText(event, item.itemId, player) }
    end
    return "Prochain boss · " .. boss.name, rows
end

--- Where the raid stands: "Raid : 38 / 40 · 6 / 11 boss" (in the group / expected, fallen / all), and the
--- data's date.
function CompactView.Footer(event, raid, fallen, inGroup)
    local parts = {}
    if event ~= nil then
        local _, expected = RaidView.ExpectedByRole(event)
        parts[#parts + 1] = string.format("Raid : %d / %d", inGroup, expected)
    end
    if raid ~= nil then
        parts[#parts + 1] = string.format("%d / %d boss", fallen, #raid.bosses)
    end
    return table.concat(parts, " · "), event and ("Données du " .. Labels.DateTime(event.exportedAt)) or ""
end
