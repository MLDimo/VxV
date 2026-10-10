local _, ns = ...

--- What the Raid screen shows (§7.1), panel by panel, as rows of text with an optional tooltip: built from the
--- event's data alone, so that it can be checked without the interface.
local RaidView = {}
ns.RaidView = RaidView

local Changes, EventData, Labels, NextBoss = ns.Changes, ns.EventData, ns.Labels, ns.NextBoss
local RaidData, RaidLog, Raids, Reserves = ns.RaidData, ns.RaidLog, ns.Raids, ns.Reserves

local Theme = VXV.Theme

-- Colors of the roles (§7.1): tanks green, healers gold, DPS amethyst.
local ROLE_COLORS = { tank = "gain", healer = "gold", dps = "amethyst" }
local ROLE_COUNTS = { tank = "tanks", healer = "heals", dps = "DPS" }
-- Tags of the loot methods (§7.1): SR violet, SR+ gold, free roll green, loot council sakura.
local METHOD_TAGS = { soft_reserve = "epic", soft_reserve_plus = "gold", free_roll = "gain", loot_council = "sakura" }
local LAST_LOOTS = 10

local row = VXV.RowList.Row

local function itemName(event, itemId)
    local item = event.items[itemId]
    return item and item.name or ("Objet n°" .. itemId)
end

local function bonusTag(bonus)
    return bonus > 0 and (" " .. Theme.Colored("SR+ " .. bonus, "gold")) or ""
end

local findSignup = EventData.SignupOf

--- The name of an item of the event's raids, reserved or not.
local function lootName(event, itemId)
    if event.items[itemId] ~= nil then
        return event.items[itemId].name
    end
    for _, item in ipairs(Raids.Loot(event.raidIds)) do
        if item.itemId == itemId then
            return item.name
        end
    end
    return "Objet n°" .. itemId
end

--- The player's change of a kind waiting for the website, or the website's refusal of the last one, as rows.
local function changeRows(kind, describe)
    local pending = Changes.Pending(kind)
    if pending ~= nil then
        return { row("line", Theme.Colored("En attente du site : " .. describe(pending), "gold")) }
    end
    local answer = Changes.Answer(kind)
    if answer ~= nil and not answer.accepted then
        return { row("line", Theme.Colored("Refusé : " .. answer.message, "loss"),
            { tooltip = { title = "Refusé par le site", lines = { answer.message } } }) }
    end
    return {}
end

local function append(rows, more)
    for _, extra in ipairs(more) do
        rows[#rows + 1] = extra
    end
    return rows
end

local function describeSignup(change)
    return string.format("%s · %s · %s", Labels.Role(change.role).label, change.spec, Labels.Status(change.status))
end

--- The expected players (present or late) of each role, in the website's order, and how many are expected.
function RaidView.ExpectedByRole(event)
    local byRole, expected = {}, 0
    for _, role in ipairs(Labels.ROLE_ORDER) do
        byRole[role] = {}
    end
    for _, signup in ipairs(event.signups) do
        if Labels.IsComing(signup.status) then
            expected = expected + 1
            local players = byRole[signup.role]
            if players ~= nil then
                players[#players + 1] = signup
            end
        end
    end
    return byRole, expected
end

--- The head of the screen: kicker, title, the date and where the data come from, and the badges
--- { text, color }: who may sign up, the players expected, the soft reserves' lock. Without event, how the data arrive.
function RaidView.Header(event, sender, now)
    if event == nil then
        return { kicker = "Conseil de guerre", title = "Aucun raid chargé", badges = {},
            subtitle = "Un officier les envoie à la guilde, ou ton compagnon VXV les apporte au prochain /reload." }
    end
    local _, expected = RaidView.ExpectedByRole(event)
    local lockAt = RaidData.LockAt(event)
    local lock = now >= lockAt and "SR verrouillées" or ("SR verrouillées dans " .. VXV.Remaining(lockAt - now))
    local origin = sender and string.format("données de %s, copiées le %s", sender, Labels.DateTime(event.exportedAt))
        or ("données du compagnon, du " .. Labels.DateTime(event.exportedAt))
    return {
        kicker = "Conseil de guerre · prochain raid",
        title = event.title,
        subtitle = string.format("%s · %d SR par joueur · %s", Labels.DateTime(event.startsAt),
            event.softReservesPerPlayer, origin),
        badges = {
            { text = event.audience, color = "amethyst" },
            { text = VXV.Count(expected, "attendu"), color = "gain" },
            { text = lock, color = "gold" },
        },
    }
end

--- "Mon inscription": the player's character, class, role and status, and the change waiting for the website.
function RaidView.Me(event, player)
    local signup = findSignup(event, player)
    if signup == nil then
        return append({ row("line", "Tu n'es pas inscrit avec ce personnage."),
            row("line", "Inscris-toi ci-dessous, sur le site ou sur Discord.") }, changeRows("signup", describeSignup))
    end
    return append({
        row("header", Labels.Colored(signup.name, signup.class)),
        row("line", string.format("%s · %s · %s", Labels.ClassName(signup.class), Labels.Role(signup.role).label,
            signup.reroll and "reroll" or "main")),
        row("line", "Spécialisation : " .. signup.spec),
        row("line", "Statut : " .. Labels.Status(signup.status)),
    }, changeRows("signup", describeSignup))
end

--- "Mes SR": each item with its boss and the SR+ bonus; the reserves waiting for the website, or why it refused.
function RaidView.MyReserves(event, player)
    local signup = findSignup(event, player)
    local changes = changeRows("reserves", function(change)
        local names = {}
        for _, itemId in ipairs(change.itemIds) do
            names[#names + 1] = lootName(event, itemId)
        end
        return #names > 0 and table.concat(names, ", ") or "aucune SR"
    end)
    if signup == nil then
        return append({ row("line", "Pas d'inscription, pas de SR.") }, changes)
    end
    local rows = {}
    for _, reserve in ipairs(signup.reserves) do
        local item = event.items[reserve.itemId]
        rows[#rows + 1] = row("line", Theme.Colored(itemName(event, reserve.itemId), "epic") .. bonusTag(reserve.bonus),
            { tooltip = { title = itemName(event, reserve.itemId),
                lines = { "Boss : " .. (item and item.boss or "?") } } })
    end
    if #signup.reserves == 0 then
        rows[1] = row("line", "Aucune SR.")
    end
    append(rows, changes)
    rows[#rows + 1] = row("line", Theme.Colored("SR+ : +10 par raid sans l'objet si tu le re-SR (max +30).", "muted"))
    return rows
end

--- The players who are not expected: maybe, bench, absent, in the website's order.
local function notExpected(event)
    local list = {}
    for _, signup in ipairs(event.signups) do
        if not Labels.IsComing(signup.status) then
            list[#list + 1] = signup
        end
    end
    return list
end

--- A player of the composition: name in the class color (dimmed when late), then the specialization of an
--- expected player or the status of another; the tooltip gives the class, role, status and whether an officer
--- invites them by hand.
local function playerRow(signup)
    local late = signup.status == "late"
    local lines = {
        Labels.ClassName(signup.class) .. " · " .. signup.spec,
        Labels.Role(signup.role).label .. " · " .. Labels.Status(signup.status),
    }
    if signup.reroll then
        lines[#lines + 1] = "Reroll : invité à la main par un officier."
    end
    local name = Theme.ClassColored(signup.name, signup.class, late)
    local detail = not Labels.IsComing(signup.status) and Labels.Status(signup.status)
        or signup.spec .. (late and (" (" .. Labels.Status(signup.status) .. ")") or "")
    return row("line", name .. " · " .. detail, { tooltip = { title = signup.name, lines = lines } })
end

--- "Composition": per role, its expected players with a bar of its share, the late ones dimmed; then the others.
function RaidView.Composition(event)
    if event == nil then
        return {}
    end
    local count = function(status)
        local total = 0
        for _, signup in ipairs(event.signups) do
            total = total + (signup.status == status and 1 or 0)
        end
        return total
    end
    local rows = { row("line", string.format("%s · %d en retard · %d au banc", VXV.Count(count("present"), "présent"),
        count("late"), count("bench"))) }
    local byRole, expected = RaidView.ExpectedByRole(event)
    for _, role in ipairs(Labels.ROLE_ORDER) do
        local players, label = byRole[role], Labels.Role(role)
        rows[#rows + 1] = row("header", string.format("%s %s · %d", label.icon, label.plural, #players))
        rows[#rows + 1] = { kind = "bar", share = expected > 0 and #players / expected or 0, color = ROLE_COLORS[role] }
        for _, signup in ipairs(players) do
            rows[#rows + 1] = playerRow(signup)
        end
    end
    local others = notExpected(event)
    if #others > 0 then
        rows[#rows + 1] = row("header", "Peut-être, banc, absents")
        for _, signup in ipairs(others) do
            rows[#rows + 1] = playerRow(signup)
        end
    end
    return rows
end

--- "SR du raid": each reserved item with its reservers and their SR+ bonus, then the items excluded.
function RaidView.RaidReserves(event)
    if event == nil then
        return {}
    end
    local rows, byItem = {}, Reserves.ByItem(event)
    for _, itemId in ipairs(event.itemOrder) do
        local item, reservers = event.items[itemId], byItem[itemId]
        if item.excluded then
            rows[#rows + 1] = row("line", Theme.Colored(item.name, "epic") .. " · exclu des SR (loot council)",
                { tooltip = { title = item.name,
                    lines = { "Boss : " .. item.boss, "Attribué par les officiers (loot council)." } } })
        elseif reservers ~= nil then
            local names, lines = {}, { "Boss : " .. item.boss }
            for _, reserver in ipairs(reservers) do
                local signup = reserver.signup
                names[#names + 1] = Labels.Colored(signup.name, signup.class) .. bonusTag(reserver.bonus)
                lines[#lines + 1] = signup.name .. (reserver.bonus > 0 and (" (SR+ +" .. reserver.bonus .. ")") or "")
            end
            rows[#rows + 1] = row("line", Theme.Colored(item.name, "epic") .. " : " .. table.concat(names, ", "),
                { tooltip = { title = item.name, lines = lines } })
        end
    end
    if #rows == 0 then
        rows[1] = row("line", "Aucune SR pour l'instant.")
    end
    return rows
end

--- "Kaelys (toi, +20), Elyra +10": the item's reservers in their class color, with their SR+ bonus; nil when none.
function RaidView.ReserverNames(event, itemId, player)
    local names = {}
    for _, reserver in ipairs(event and Reserves.For(event, itemId) or {}) do
        local signup = reserver.signup
        local bonus = reserver.bonus > 0 and ("+" .. reserver.bonus) or nil
        local name = Labels.Colored(signup.name, signup.class)
        if signup.name == player then
            name = name .. " (toi" .. (bonus and (", " .. bonus) or "") .. ")"
        elseif bonus ~= nil then
            name = name .. " " .. bonus
        end
        names[#names + 1] = name
    end
    return #names > 0 and table.concat(names, ", ") or nil
end

--- The next boss (P8.2) at the head of the raid's soft reserves: its loot, and who reserved each item. None
--- without the raid's data pack, or once every boss fell.
function RaidView.NextBoss(event, player)
    local log = RaidLog.Current()
    local found = event and NextBoss.Find(event, log and log.kills or {})
    if found == nil or found.boss == nil then
        return {}
    end
    local rows = { row("header", Theme.Colored("Prochain boss · " .. found.boss.name, "sakura")) }
    for _, item in ipairs(found.boss.loot) do
        local name, names = Theme.Colored(item.name, "epic"), RaidView.ReserverNames(event, item.itemId, player)
        local listed = event.items[item.itemId]
        if listed ~= nil and listed.excluded then
            rows[#rows + 1] = row("line", name .. " · exclu des SR (loot council)")
        elseif names ~= nil then
            rows[#rows + 1] = row("line", name .. " : " .. names)
        else
            rows[#rows + 1] = row("line", name .. " · aucune SR (roll libre)")
        end
    end
    return rows
end

--- The Taverne's card (§7.0): the next raid and its expected players by role.
function RaidView.Card(event)
    if event == nil then
        return { title = "Aucun raid chargé", action = "Voir le raid",
            lines = { "Un officier les envoie à la guilde, ou ton compagnon VXV les apporte." } }
    end
    local byRole, expected = RaidView.ExpectedByRole(event)
    local roles = {}
    for _, role in ipairs(Labels.ROLE_ORDER) do
        roles[#roles + 1] = Theme.Colored(#byRole[role] .. " " .. ROLE_COUNTS[role], ROLE_COLORS[role])
    end
    return {
        title = Labels.DateTime(event.startsAt),
        lines = { event.title .. " · " .. VXV.Count(expected, "attendu"), table.concat(roles, "  ") },
        action = "Voir le raid",
    }
end

--- The requests to join, for the leader of the invitations: a click invites.
function RaidView.Requests(requests)
    local rows = {}
    for _, request in ipairs(requests) do
        local requestRow = row("line", request.name .. " · " .. request.reason,
            { tooltip = { title = request.name, lines = { request.reason, "Clic : inviter" } } })
        requestRow.invite = request.name
        rows[#rows + 1] = requestRow
    end
    return rows
end

--- "Derniers loots": the items given at this raid, the latest first, with their method's tag.
function RaidView.LastLoots(log)
    local rows = {}
    local loots = log and log.loots or {}
    for index = #loots, math.max(1, #loots - LAST_LOOTS + 1), -1 do
        local loot = loots[index]
        rows[#rows + 1] = { kind = "line", link = loot.link, text = string.format("%s → %s %s", loot.link,
            loot.winner, Theme.Colored(Labels.Method(loot.method), METHOD_TAGS[loot.method] or "muted")) }
    end
    if #rows == 0 then
        rows[1] = row("line", "Aucun objet donné pour l'instant.")
    end
    return rows
end
