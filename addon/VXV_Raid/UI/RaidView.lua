local _, ns = ...

--- What the Raid tab shows, as rows of text with an optional tooltip: built from the event's data alone, so
--- that it can be checked without the interface.
local RaidView = {}
ns.RaidView = RaidView

local Labels = ns.Labels

local NO_EVENT = {
    "Aucun raid chargé pour l'instant.",
    "Un officier charge les données depuis la page de l'événement sur le site (/vxv importer).",
}

local function row(kind, text, tooltip)
    return { kind = kind, text = text, tooltip = tooltip }
end

local function itemName(event, itemId)
    local item = event.items[itemId]
    return item and item.name or ("Objet n°" .. itemId)
end

local function bonusText(bonus)
    return bonus > 0 and (" +" .. bonus) or ""
end

--- Coming players first (present, then late), then maybe, bench and absent; in each, the website's order.
local function sortedSignups(event)
    local rank, position, list = {}, {}, {}
    for index, status in ipairs(Labels.STATUS_ORDER) do
        rank[status] = index
    end
    for index, signup in ipairs(event.signups) do
        position[signup], list[index] = index, signup
    end
    local last = #Labels.STATUS_ORDER + 1
    table.sort(list, function(left, right)
        local leftRank, rightRank = rank[left.status] or last, rank[right.status] or last
        if leftRank ~= rightRank then
            return leftRank < rightRank
        end
        return position[left] < position[right]
    end)
    return list
end

local function composition(event)
    local counts, coming = {}, 0
    for _, signup in ipairs(event.signups) do
        if Labels.IsComing(signup.status) then
            counts[signup.role] = (counts[signup.role] or 0) + 1
            coming = coming + 1
        end
    end
    local parts = {}
    for _, role in ipairs(Labels.ROLE_ORDER) do
        parts[#parts + 1] = Labels.Role(role).plural .. " " .. (counts[role] or 0)
    end
    return coming, table.concat(parts, " · ")
end

local function signupRow(signup)
    local status = signup.status == "present" and "" or (" (" .. Labels.Status(signup.status) .. ")")
    local role = Labels.Role(signup.role)
    local lines = {
        Labels.ClassName(signup.class) .. " · " .. signup.spec,
        role.label .. " · " .. Labels.Status(signup.status),
    }
    if signup.reroll then
        lines[#lines + 1] = "Reroll : invité à la main par un officier."
    end
    local text = role.icon .. " " .. Labels.Colored(signup.name, signup.class) .. " · " .. signup.spec .. status
    return row("line", text, { title = signup.name, lines = lines })
end

local function addSignups(rows, event)
    local coming, counts = composition(event)
    rows[#rows + 1] = row("header", string.format("Inscrits (%d attendus sur %d)", coming, #event.signups))
    rows[#rows + 1] = row("line", counts)
    for _, signup in ipairs(sortedSignups(event)) do
        rows[#rows + 1] = signupRow(signup)
    end
end

local function addMyReserves(rows, event, playerName)
    rows[#rows + 1] = row("header", "Mes SR")
    for _, signup in ipairs(event.signups) do
        if signup.name == playerName then
            for _, reserve in ipairs(signup.reserves) do
                local item = event.items[reserve.itemId]
                local boss = item and (" (" .. item.boss .. ")") or ""
                rows[#rows + 1] = row("line", itemName(event, reserve.itemId) .. boss .. bonusText(reserve.bonus))
            end
            if #signup.reserves == 0 then
                rows[#rows + 1] = row("line", "Aucune SR.")
            end
            return
        end
    end
    rows[#rows + 1] = row("line", "Tu n'es pas inscrit avec ce personnage.")
end

--- Reservers of each item: { signup, bonus }, highest bonus first, then by name.
local function reserversByItem(event)
    local byItem = {}
    for _, signup in ipairs(event.signups) do
        for _, reserve in ipairs(signup.reserves) do
            local list = byItem[reserve.itemId] or {}
            list[#list + 1] = { signup = signup, bonus = reserve.bonus }
            byItem[reserve.itemId] = list
        end
    end
    for _, list in pairs(byItem) do
        table.sort(list, function(left, right)
            if left.bonus ~= right.bonus then
                return left.bonus > right.bonus
            end
            return left.signup.name < right.signup.name
        end)
    end
    return byItem
end

local function addRaidReserves(rows, event)
    rows[#rows + 1] = row("header", "SR du raid")
    local byItem, any = reserversByItem(event), false
    for _, itemId in ipairs(event.itemOrder) do
        local reservers = byItem[itemId]
        if reservers ~= nil then
            any = true
            local names, lines = {}, { "Boss : " .. event.items[itemId].boss }
            for _, reserver in ipairs(reservers) do
                local signup = reserver.signup
                names[#names + 1] = Labels.Colored(signup.name, signup.class) .. bonusText(reserver.bonus)
                lines[#lines + 1] = signup.name .. (reserver.bonus > 0 and (" (SR+ +" .. reserver.bonus .. ")") or "")
            end
            local text = itemName(event, itemId) .. " : " .. table.concat(names, ", ")
            rows[#rows + 1] = row("line", text, { title = itemName(event, itemId), lines = lines })
        end
    end
    if not any then
        rows[#rows + 1] = row("line", "Aucune SR pour l'instant.")
    end
end

local function addExclusions(rows, event)
    local excluded = {}
    for _, itemId in ipairs(event.itemOrder) do
        local item = event.items[itemId]
        if item.excluded then
            excluded[#excluded + 1] = row("line", item.name .. " (" .. item.boss .. ")", {
                title = item.name,
                lines = { "Exclu des SR : attribué par les officiers (loot council)." },
            })
        end
    end
    if #excluded > 0 then
        rows[#rows + 1] = row("header", "Objets exclus des SR")
        for _, excludedRow in ipairs(excluded) do
            rows[#rows + 1] = excludedRow
        end
    end
end

local function addJournal(rows, event)
    rows[#rows + 1] = row("header", string.format("Modifications (%d)", #event.journal))
    for index = #event.journal, 1, -1 do
        local entry = event.journal[index]
        local when = Labels.DateTime(entry.at)
        rows[#rows + 1] = row("line", when .. " · " .. entry.actor .. " · " .. entry.summary, {
            title = entry.actor .. " · " .. when,
            lines = { entry.summary, "Motif : " .. entry.reason },
        })
    end
    if #event.journal == 0 then
        rows[#rows + 1] = row("line", "Aucune modification par les officiers.")
    end
end

--- When and from whom the data came.
local function origin(event, sender)
    local when = Labels.DateTime(event.exportedAt)
    return sender and string.format("données de %s, copiées le %s", sender, when) or ("données copiées le " .. when)
end

local function addRequests(rows, requests)
    if #requests == 0 then
        return
    end
    rows[#rows + 1] = row("header", string.format("Demandes pour rejoindre (%d)", #requests))
    for _, request in ipairs(requests) do
        local requestRow = row("line", request.name .. " · " .. request.reason, {
            title = request.name,
            lines = { request.reason, "Clic : inviter" },
        })
        requestRow.invite = request.name
        rows[#rows + 1] = requestRow
    end
end

--- Rows of the tab: { kind = "title" | "header" | "line", text, tooltip = { title, lines } or nil, invite = name
--- or nil }. The view holds the event, the player's name, who sent the data and the requests to join.
function RaidView.Rows(view)
    local event, playerName = view.event, view.player
    if event == nil then
        return { row("line", NO_EVENT[1]), row("line", NO_EVENT[2]) }
    end
    local rows = {
        row("title", event.title .. " · " .. Labels.DateTime(event.startsAt)),
        row("line", string.format("%d SR par joueur · %s", event.softReservesPerPlayer, origin(event, view.sender))),
    }
    addRequests(rows, view.requests or {})
    addSignups(rows, event)
    addMyReserves(rows, event, playerName)
    addRaidReserves(rows, event)
    addExclusions(rows, event)
    addJournal(rows, event)
    return rows
end
