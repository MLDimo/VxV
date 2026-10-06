local _, ns = ...

--- What the Quêtes screen shows (§7.4), as rows for the core's lists: the missions with their reward split, their
--- ranking and the player's progress, the ones to come, the ended ones, and the hall of fame.
local QuestsView = {}
ns.QuestsView = QuestsView

local Counters, Quests, Readings = ns.Counters, ns.Quests, ns.Readings

local Gold = VXV.Gold

local DATE = "%d/%m %H:%M"
local SHOWN_SCORES = 5
local SHARES = { 70, 20, 10 }
local PERCENT = 100
local NO_DATA = "Aucune donnée des quêtes : un officier les envoie à la guilde, ou ton compagnon VXV les apporte."
local NO_QUEST = "Aucune quête en cours : les officiers les publient sur le site et sur Discord."
local NOT_MEASURED = "Ce compteur n'est pas encore lu en jeu : le site compte les relevés du compagnon."
local STATUS = {
    upcoming = "Commence le %s",
    running = "Se termine le %s",
    ended = "Terminée : résultat à valider par un officier",
    closed = "Résultat validé",
}

local function row(kind, text)
    return { kind = kind, text = text }
end

--- "1er", "2e", "3e".
local function place(rank)
    return rank == 1 and "1er" or (rank .. "e")
end

local function readable(kind)
    for _, candidate in ipairs(Counters.Readable()) do
        if candidate == kind then
            return true
        end
    end
    return false
end

--- The head of the screen: when the data were exported.
function QuestsView.Subtitle(data)
    return data == nil and NO_DATA or ("Données du " .. date(DATE, data.exportedAt))
end

--- The player's progress on the mission: their score and place, or why there is none.
local function progress(mission, data, ranking)
    local labels = Counters.LABELS[mission.kind] or { counts = "" }
    if not readable(mission.kind) then
        return NOT_MEASURED
    end
    local score = Readings.Score(mission, data)
    local memberId = Quests.MemberId(data)
    for index, entry in ipairs(ranking) do
        if entry.memberId == memberId then
            return ("%d %s · %s"):format(entry.score, labels.counts, place(index))
        end
    end
    return score > 0 and ("%d %s"):format(score, labels.counts) or "Rien encore : ton compteur est relevé en jeu."
end

--- A mission: what counts, when, the reward split, the first five and the player's progress.
function QuestsView.Mission(mission, data, now)
    local labels = Counters.LABELS[mission.kind] or { name = mission.kind, counts = "" }
    local status = Quests.Status(mission, now)
    local split = {}
    for index, share in ipairs(SHARES) do
        split[#split + 1] = place(index) .. " " .. Gold.Format(math.floor(mission.reward * share / PERCENT))
    end
    local ranking = Quests.Ranking(mission)
    local rows = {
        row("title", mission.title),
        row("line", ("%s · le plus de %s"):format(labels.name, labels.counts)),
        row("line", STATUS[status]:format(date(DATE, status == "upcoming" and mission.startsAt or mission.endsAt))),
        row("line", ("Récompense %s : %s"):format(Gold.Format(mission.reward), table.concat(split, " · "))),
        row("header", "Classement"),
    }
    for index = 1, math.min(SHOWN_SCORES, #ranking) do
        local entry = ranking[index]
        rows[#rows + 1] = row("line", ("%d. %s · %d"):format(index, VXV.ClassColored(entry.name, entry.class),
            entry.score))
    end
    if #ranking == 0 then
        rows[#rows + 1] = row("line", "Personne pour l'instant.")
    end
    for _, reward in ipairs(mission.rewards) do
        rows[#rows + 1] = row("line", ("%s : %s · %s"):format(place(reward.rank), reward.name,
            Gold.Format(reward.amount) .. (reward.paid and " · versée" or " · à verser")))
    end
    if status == "running" or status == "upcoming" then
        rows[#rows + 1] = row("header", "Ma progression")
        rows[#rows + 1] = row("line", progress(mission, data, ranking))
    end
    return rows
end

--- The board: the running missions, then those to come and the ended ones, briefly.
function QuestsView.Board(data, now)
    if data == nil then
        return { row("line", NO_DATA) }
    end
    local rows = {}
    for _, mission in ipairs(Quests.WithStatus(data, now, "running")) do
        for _, entry in ipairs(QuestsView.Mission(mission, data, now)) do
            rows[#rows + 1] = entry
        end
    end
    if #rows == 0 then
        rows[1] = row("line", NO_QUEST)
    end
    return rows
end

--- The missions to come and the ended ones, one line each.
function QuestsView.Others(data, now)
    local rows = {}
    for _, mission in ipairs(Quests.WithStatus(data, now, "upcoming")) do
        rows[#rows + 1] = row("line", ("%s · commence le %s"):format(mission.title, date(DATE, mission.startsAt)))
    end
    for _, status in ipairs({ "ended", "closed" }) do
        for _, mission in ipairs(Quests.WithStatus(data, now, status)) do
            local first = Quests.Ranking(mission)[1]
            rows[#rows + 1] = row("line", ("%s · %s%s"):format(mission.title, STATUS[status],
                first and (" · 1er " .. first.name) or ""))
        end
    end
    if #rows == 0 then
        rows[1] = row("line", "Rien d'autre pour l'instant.")
    end
    return rows
end

--- The hall of fame (P12.7): missions won, gold won, mean place where the member scored.
function QuestsView.HallOfFame(data)
    local rows = {}
    for index, entry in ipairs(data ~= nil and data.hallOfFame or {}) do
        rows[#rows + 1] = row("line", ("%d. %s · %s · %s · pos. %s"):format(index,
            VXV.ClassColored(entry.name, entry.class), VXV.Count(entry.wins, "gagnée"), Gold.Format(entry.gains),
            (("%.1f"):format(entry.position):gsub("%.", ","))))
    end
    if #rows == 0 then
        rows[1] = row("line", "Aucune quête accomplie pour l'instant.")
    end
    return rows
end

--- The Taverne's card: the running quest, its reward and its leader.
function QuestsView.Card(data, now)
    local mission = Quests.WithStatus(data, now, "running")[1]
    if mission == nil then
        return { title = "Aucune quête en cours", action = "Voir le tableau",
            lines = { "Les officiers publient les quêtes sur le site et sur Discord." } }
    end
    local labels = Counters.LABELS[mission.kind] or { name = mission.kind }
    local leader = Quests.Ranking(mission)[1]
    return {
        title = mission.title,
        lines = { labels.name .. " · " .. Gold.Format(mission.reward),
            leader and ("En tête : %s (%d)"):format(leader.name, leader.score) or "Personne en tête pour l'instant." },
        action = "Voir le tableau",
    }
end
