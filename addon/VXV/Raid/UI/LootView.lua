local ns = select(2, ...).Raid

--- What the loot panel shows: each item the boss dropped with the soft reserves set on it, or who received it, then
--- the attribution in progress: this member's message, and for the master looter the rolls, the winner or the loot
--- council's choice; once given, the master looter's recap of it. Built from data alone.
local LootView = {}
ns.LootView = LootView

local Attribution, Labels, Reserves = ns.Attribution, ns.Labels, ns.Reserves

local Theme = VXV.Theme

local function dimmed(text)
    return Theme.Colored(text, "muted")
end

local function bonusText(bonus)
    return bonus > 0 and (" +" .. bonus) or ""
end

local function reservedBy(reservers, inGroup)
    local names = {}
    for _, reserver in ipairs(reservers) do
        local signup = reserver.signup
        if inGroup[signup.name] then
            names[#names + 1] = Labels.Colored(signup.name, signup.class) .. bonusText(reserver.bonus)
        else
            names[#names + 1] = dimmed(signup.name .. " (absent)")
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

local function addRolls(rows, round)
    if #round.rolls == 0 and not round.finished then
        rows[#rows + 1] = { kind = "line", text = "En attente des rolls (30 s)…" }
    end
    for _, roll in ipairs(round.rolls) do
        if roll.valid then
            local bonus = round.bonuses and round.bonuses[roll.name] or 0
            local total = Attribution.Total(round, roll)
            local detail = bonus > 0 and string.format("%d + %d = %d", roll.roll, bonus, total) or tostring(total)
            rows[#rows + 1] = { kind = "line", text = roll.name .. " : " .. detail }
        else
            local text = roll.name .. " : " .. roll.roll .. " (" .. roll.reason .. ")"
            rows[#rows + 1] = { kind = "line", text = dimmed(text) }
        end
    end
end

local function addCouncilChoice(rows, inGroup)
    local names = {}
    for name in pairs(inGroup) do
        names[#names + 1] = name
    end
    table.sort(names)
    rows[#rows + 1] = { kind = "header", text = "Donner à (loot council)" }
    for _, name in ipairs(names) do
        rows[#rows + 1] = { kind = "line", text = name, give = name }
    end
end

local function addMasterLooter(rows, active, inGroup)
    if active.round ~= nil then
        addRolls(rows, active.round)
    end
    if active.result ~= nil then
        rows[#rows + 1] = { kind = "line", text = string.format("Gagnant : %s (%s)", active.result.winner,
            Labels.Method(active.result.method)) }
    elseif active.plan.mode == "council" then
        addCouncilChoice(rows, inGroup)
    end
end

--- "donné à Thom Leboss (SR+)".
local function givenText(given)
    return "donné à " .. given.winner .. (given.method and (" (" .. Labels.Method(given.method) .. ")") or "")
end

--- Rows of the loot panel. The view holds drop, event, inGroup (names of the group's members), and the
--- attribution: active (the master looter's, or nil), shown (this member's message, or nil), last (the master
--- looter's last attribution given, or nil), isMasterLooter and selected (the item the master looter chose).
--- Item rows carry pick = item when the master looter may choose it; council rows carry give = name.
function LootView.Rows(view)
    local drop, event, inGroup = view.drop, view.event, view.inGroup
    local rows = { { kind = "title", text = "Butin de " .. drop.boss } }
    if event == nil then
        rows[#rows + 1] = { kind = "line", text = "Pas de données de raid : un officier les charge (/vxv importer)." }
    end
    local canPick = view.isMasterLooter and view.active == nil
    if canPick then
        rows[#rows + 1] = { kind = "line", text = "Choisis un objet, puis lance son attribution." }
    end
    for _, item in ipairs(drop.items) do
        local open = item.given == nil and item.slot ~= nil
        local text = item.link .. " : " .. (item.given and givenText(item.given) or status(event, item, inGroup))
        rows[#rows + 1] = { kind = "line", text = (item == view.selected and "▸ " or "") .. text, link = item.link,
            pick = canPick and open and item or nil }
    end
    if view.shown ~= nil then
        rows[#rows + 1] = { kind = "header", text = "Attribution : " .. view.shown.link }
        rows[#rows + 1] = { kind = "line", text = view.shown.message }
    end
    if view.active ~= nil then
        addMasterLooter(rows, view.active, inGroup)
    elseif view.last ~= nil then
        rows[#rows + 1] = { kind = "header", text = "Récapitulatif : " .. view.last.item.link }
        addMasterLooter(rows, view.last, inGroup)
    end
    return rows
end
