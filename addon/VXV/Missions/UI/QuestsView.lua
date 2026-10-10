local ns = select(2, ...).Missions

--- What the Quêtes screen shows (§7.4, docs/design/maquettes/AddonMissions.html), in the website's words: the quest
--- pinned on the board with its reward split, its first five and the player's progress toward the podium, the quests
--- to come, the ended ones, the hall of fame; and the rows of the reduced mode.
local QuestsView = {}
ns.QuestsView = QuestsView

local Counters, Quests = ns.Counters, ns.Quests

local Gold, Theme = VXV.Gold, VXV.Theme

local SHOWN_SCORES = 5
local SHARES = { 70, 20, 10 }
local PODIUM = #SHARES
local PERCENT = 100
local WEEK = 7 * 24 * 60 * 60
local NO_DATA = "Aucune donnée des quêtes : un officier les envoie à la guilde, ou ton compagnon VXV les apporte."
local NO_QUEST = "Aucune quête en cours : les officiers les publient ici, sur le site et sur Discord."
local NOT_MEASURED = "Ce compteur n'est pas lu en jeu : le site compte les relevés du compagnon."
local NOTHING_YET = "Rien encore : l'addon VXV relève ton compteur en jeu."
local NO_PLACE = "—"
local KICKERS = {
    upcoming = "Quête à venir",
    running = "Quête de la semaine",
    ended = "Quête terminée",
    closed = "Quête accomplie",
}

local row = VXV.RowList.Row

--- "1er", "2e", "3e".
local function place(rank)
    return rank == 1 and "1er" or (rank .. "e")
end

local function labelsOf(mission)
    return Counters.LABELS[mission.kind] or { name = mission.kind, counts = "" }
end

local function readable(kind)
    for _, candidate in ipairs(Counters.Readable()) do
        if candidate == kind then
            return true
        end
    end
    return false
end

--- "le plus de pêches réussies", "le plus d'herbes cueillies".
function QuestsView.MostOf(counts)
    local elided = counts:match("^[aeiouyh]") or counts:match("^\195[\168-\170]")
    return (elided and "le plus d'" or "le plus de ") .. counts
end

--- The quests pinned on the board: those running, else the first to come.
function QuestsView.Pinned(data, now)
    local running = Quests.WithStatus(data, now, "running")
    if #running > 0 then
        return running
    end
    return { Quests.WithStatus(data, now, "upcoming")[1] }
end

--- The head's line: only why there is nothing to show.
function QuestsView.Subtitle(data)
    return data == nil and NO_DATA or ""
end

--- The head's badges, from the right: when the pinned quest ends or begins, and that the whole guild takes part.
function QuestsView.Badges(data, now)
    local badges = {}
    local first = QuestsView.Pinned(data, now)[1]
    if first ~= nil then
        local running = Quests.Status(first, now) == "running"
        badges[1] = { color = "gold", text = running and ("Fin dans " .. VXV.Remaining(first.endsAt - now))
            or ("Début dans " .. VXV.Remaining(first.startsAt - now)) }
    end
    badges[#badges + 1] = { text = "Toute la guilde participe", color = "gain" }
    return badges
end

--- The player's progress: ahead, on the podium, or how much more to climb on it (a tie goes to the first to reach).
local function progress(mission, ranking, memberId)
    local counts = labelsOf(mission).counts
    if not readable(mission.kind) then
        return { text = NOT_MEASURED, place = NO_PLACE }
    end
    local index
    for candidate, entry in ipairs(ranking) do
        if entry.memberId == memberId then
            index = candidate
        end
    end
    local mine = index and ranking[index].score or 0
    if mine <= 0 then
        return { text = NOTHING_YET, place = NO_PLACE }
    end
    local function toPass(above)
        return ("%d %s"):format(above - mine + 1, counts)
    end
    local text
    if index == 1 then
        text = ("En tête, avec %d %s d'avance"):format(mine - (ranking[2] and ranking[2].score or 0), counts)
    elseif index <= PODIUM then
        text = "Sur le podium : encore " .. toPass(ranking[1].score) .. " pour la 1re place"
    else
        text = "Encore " .. toPass(ranking[PODIUM].score) .. " pour monter sur le podium"
    end
    return { text = text, place = place(index) }
end

--- A quest on its parchment: kicker, title, what the guild rewards, the reward split, the first five (the player's
--- line marked, the names colored by who draws them) and the player's progress.
function QuestsView.Sheet(mission, data, now)
    local labels = labelsOf(mission)
    local status = Quests.Status(mission, now)
    local prizes = {}
    for index, share in ipairs(SHARES) do
        prizes[index] = { label = ("%s · %d %%"):format(place(index), share),
            gold = Gold.Format(math.floor(mission.reward * share / PERCENT)) }
    end
    local ranking, memberId = Quests.Ranking(mission), VXV.MemberOf(data)
    local best = ranking[1] and ranking[1].score or 0
    local lead = {}
    for index = 1, math.min(SHOWN_SCORES, #ranking) do
        local entry = ranking[index]
        local mine = entry.memberId == memberId
        lead[index] = {
            rank = index,
            name = mine and ("Toi · " .. entry.name) or entry.name,
            class = entry.class,
            mine = mine,
            score = entry.score,
            share = best > 0 and entry.score / best or 0,
        }
    end
    return {
        kicker = KICKERS[status] .. " · " .. labels.name,
        title = mission.title,
        pitch = ("Qui fera %s d'ici la fin remporte la récompense : main et rerolls additionnés, d'après les "
            .. "compteurs du jeu."):format(QuestsView.MostOf(labels.counts)),
        prizes = prizes,
        lead = lead,
        empty = #lead == 0 and "Personne pour l'instant." or nil,
        progress = progress(mission, ranking, memberId),
        closed = status == "closed",
    }
end

--- The quests to come not pinned, each with what counts and its reward; the note says when the first begins.
function QuestsView.ToCome(data, now)
    local pinned = QuestsView.Pinned(data, now)[1]
    local quests = {}
    for _, mission in ipairs(Quests.WithStatus(data, now, "upcoming")) do
        if mission ~= pinned then
            local counted = QuestsView.MostOf(labelsOf(mission).counts):gsub("^%l", string.upper)
            quests[#quests + 1] = { title = mission.title,
                line = counted .. " · " .. Theme.Colored(Gold.Format(mission.reward), "stamp-cash"),
                startsAt = mission.startsAt }
        end
    end
    return {
        note = quests[1] and ("dans " .. VXV.Remaining(quests[1].startsAt - now)) or "",
        quests = quests,
        empty = #quests == 0 and "Rien de prévu pour l'instant." or nil,
    }
end

--- How long ago a quest ended: "Cette semaine", "Semaine dernière", "Il y a 3 semaines".
local function endedAgo(endsAt, now)
    local weeks = math.floor((now - endsAt) / WEEK)
    if weeks <= 0 then
        return "Cette semaine"
    end
    return weeks == 1 and "Semaine dernière" or ("Il y a " .. weeks .. " semaines")
end

--- Who won the quest, or leads it until an officer validates it, and the best score.
local function winnerLine(mission, closed)
    local ranking = Quests.Ranking(mission)
    local first = ranking[1]
    if first == nil then
        return labelsOf(mission).name .. " · personne n'a marqué"
    end
    local winner = first
    for _, reward in ipairs(mission.rewards) do
        if reward.rank == 1 then
            winner = { name = reward.name }
            for _, entry in ipairs(ranking) do
                if entry.name == reward.name then
                    winner.class = entry.class
                end
            end
        end
    end
    return ("%s · %s %s (%d)"):format(labelsOf(mission).name, closed and "gagnée par" or "en tête",
        Theme.ParchmentClassColored(winner.name, winner.class), first.score)
end

--- The ended quests, the latest first: when, their title and their winner, under their stamp (accomplished once an
--- officer validated it, else to validate).
function QuestsView.Ended(data, now)
    local ended = Quests.WithStatus(data, now, "ended")
    for _, mission in ipairs(Quests.WithStatus(data, now, "closed")) do
        ended[#ended + 1] = mission
    end
    table.sort(ended, function(left, right)
        return left.endsAt > right.endsAt
    end)
    local quests = {}
    for index, mission in ipairs(ended) do
        local closed = Quests.Status(mission, now) == "closed"
        quests[index] = { title = mission.title, when = endedAgo(mission.endsAt, now), closed = closed,
            line = winnerLine(mission, closed) }
    end
    return { quests = quests, empty = #quests == 0 and "Aucune quête terminée pour l'instant." or nil }
end

--- The hall of fame (P12.7): quests won, gold won, mean place where the member scored.
function QuestsView.HallOfFame(data)
    local entries = {}
    for index, entry in ipairs(data ~= nil and data.hallOfFame or {}) do
        entries[index] = {
            rank = index,
            name = VXV.ClassColored(entry.name, entry.class),
            wins = tostring(entry.wins),
            detail = ("%s · pos. moy. %s"):format(Gold.Format(entry.gains),
                (("%.1f"):format(entry.position):gsub("%.", ","))),
        }
    end
    return { entries = entries, empty = #entries == 0 and "Aucune quête accomplie pour l'instant." or nil }
end

--- The reduced mode: the pinned quests as rows, with their ranking and the player's progress.
function QuestsView.Board(data, now)
    if data == nil then
        return { row("line", NO_DATA) }
    end
    local rows = {}
    for _, mission in ipairs(QuestsView.Pinned(data, now)) do
        local sheet = QuestsView.Sheet(mission, data, now)
        local split = {}
        for _, prize in ipairs(sheet.prizes) do
            split[#split + 1] = prize.label:match("^%S+") .. " " .. prize.gold
        end
        rows[#rows + 1] = row("title", sheet.title)
        rows[#rows + 1] = row("line", sheet.kicker)
        rows[#rows + 1] = row("line", ("Récompense %s : %s"):format(Gold.Format(mission.reward),
            table.concat(split, " · ")))
        rows[#rows + 1] = row("header", "Classement")
        for _, entry in ipairs(sheet.lead) do
            local name = entry.mine and Theme.Colored(entry.name, "amethyst")
                or VXV.ClassColored(entry.name, entry.class)
            rows[#rows + 1] = row("line", ("%d. %s · %d"):format(entry.rank, name, entry.score))
        end
        if sheet.empty ~= nil then
            rows[#rows + 1] = row("line", sheet.empty)
        end
        rows[#rows + 1] = row("header", "Ta progression")
        rows[#rows + 1] = row("line", sheet.progress.text)
    end
    if #rows == 0 then
        rows[1] = row("line", NO_QUEST)
    end
    return rows
end

--- The board's text when no quest is pinned.
QuestsView.NO_QUEST = NO_QUEST

--- The Taverne's card: the running quest, its reward and its leader.
function QuestsView.Card(data, now)
    local mission = Quests.WithStatus(data, now, "running")[1]
    if mission == nil then
        return { title = "Aucune quête en cours", action = "Voir le tableau",
            lines = { "Les officiers publient les quêtes ici, sur le site et sur Discord." } }
    end
    local leader = Quests.Ranking(mission)[1]
    return {
        title = mission.title,
        lines = { labelsOf(mission).name .. " · " .. Gold.Format(mission.reward),
            leader and ("En tête : %s (%d)"):format(leader.name, leader.score) or "Personne en tête pour l'instant." },
        action = "Voir le tableau",
    }
end
