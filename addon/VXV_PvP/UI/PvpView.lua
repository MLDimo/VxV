local _, ns = ...

--- What the PvP place shows: the PvP events to come with the player's sign-up and the duels with what the player may
--- do, as rows for the core's lists, and the Elo board for the core's ranking board. Built from the data alone.
local PvpView = {}
ns.PvpView = PvpView

local Changes = ns.Changes
local SignupLabels = VXV.SignupLabels

local DATE = "%d/%m %H:%M"
local NO_DATA = "Aucune donnée PvP : un officier les envoie à la guilde, ou ton compagnon VXV les apporte."
local NO_OUTING = "Aucun événement PvP prévu : les officiers les créent ici, sur le site ou sur Discord (/vxv_pvp)."
local NO_DUEL = "Aucun duel : défie un membre de la guilde, en jeu ou sur le site."
local NO_RANKING = "Aucun duel joué pour l'instant."
local WAITING = "En attente du site"
local DUEL_STATUSES = { proposed = "défi lancé", scheduled = "défi relevé", refused = "refusé", cancelled = "annulé" }
-- The Elo every duelist starts with (domain/duels.ts); the board's first places, on banners.
local ELO_START, PODIUM = 0, 3

local row = VXV.RowList.Row

--- A member as the PvP data name them, in their class color.
local function nameOf(data, memberId)
    local player = data.players[memberId]
    return player and VXV.ClassColored(player.name, player.class) or "?"
end

--- The head of the screen: when the data were exported, and the player's Elo.
function PvpView.Header(data, memberId)
    if data == nil then
        return { subtitle = NO_DATA, badges = {} }
    end
    local rating
    for _, entry in ipairs(data.ranking) do
        if entry.memberId == memberId then
            rating = entry.rating
        end
    end
    return {
        subtitle = "Données du " .. date(DATE, data.exportedAt),
        badges = { { text = "Mon Elo : " .. VXV.RankingBoard.Value("points", rating or ELO_START), color = "gold" } },
    }
end

--- The player's sign-up to the outing: waiting for the website, known by it, or none.
local function mySignup(outing, player)
    local pending = Changes.Pending("signup", outing.id)
    if pending ~= nil then
        return WAITING .. " : " .. SignupLabels.Status(pending.status)
    end
    for _, signup in ipairs(outing.signups) do
        if signup.name == player then
            return "Inscrit : " .. SignupLabels.Status(signup.status)
        end
    end
    return "Pas inscrit · clic : s'inscrire"
end

--- The outings to come: title (a click signs up), when and who may sign up, who comes, the player's sign-up.
function PvpView.Outings(data, player, onSignup)
    if data == nil then
        return { row("line", NO_DATA) }
    end
    local rows, waiting = {}, Changes.Pending("pvpEvent")
    if waiting ~= nil then
        rows[#rows + 1] = row("line", WAITING .. " : événement « " .. waiting.title .. " »")
    end
    if #data.outings == 0 then
        rows[#rows + 1] = row("line", NO_OUTING)
    end
    for _, outing in ipairs(data.outings) do
        local coming = 0
        for _, signup in ipairs(outing.signups) do
            coming = coming + (SignupLabels.IsComing(signup.status) and 1 or 0)
        end
        rows[#rows + 1] = row("title", outing.title, {
            tooltip = { title = outing.title, lines = { "Clic : m'inscrire" } },
            onClick = function()
                onSignup(outing)
            end,
        })
        rows[#rows + 1] = row("line", date(DATE, outing.startsAt) .. " · " .. outing.audience)
        rows[#rows + 1] = row("line", VXV.Count(coming, "attendu") .. " · " .. mySignup(outing, player))
    end
    return rows
end

--- What the player may do with the duel: answer it (its opponent), concede it or call it off (its players).
function PvpView.Actions(duel, memberId)
    local opponent, player = memberId == duel.opponentId, memberId == duel.challengerId or memberId == duel.opponentId
    if duel.status == "proposed" then
        return { accept = opponent, refuse = opponent, cancel = player }
    end
    if duel.status == "scheduled" then
        return { concede = player, cancel = player }
    end
    return {}
end

--- A duel's state: its winner, its status, or the player's change waiting for the website.
local function duelState(data, duel)
    if Changes.Pending(nil, duel.id) ~= nil then
        return WAITING
    end
    if duel.status == "played" then
        return nameOf(data, duel.winnerId) .. " gagne"
    end
    return DUEL_STATUSES[duel.status] or duel.status
end

--- The duels: who against whom (a click opens the player's actions), when, where and how it stands, and its bet.
function PvpView.Duels(data, memberId, onAct)
    if data == nil then
        return { row("line", NO_DATA) }
    end
    local rows, waiting = {}, Changes.Pending("duel")
    if waiting ~= nil then
        rows[#rows + 1] = row("line", ("%s : défi du %s à %s"):format(WAITING, waiting.date, waiting.time))
    end
    if #data.duels == 0 then
        rows[#rows + 1] = row("line", NO_DUEL)
    end
    for _, duel in ipairs(data.duels) do
        local actions = next(PvpView.Actions(duel, memberId)) ~= nil
        rows[#rows + 1] = row("title", nameOf(data, duel.challengerId) .. " contre " .. nameOf(data, duel.opponentId),
            actions and {
                tooltip = { title = "Duel", lines = { "Clic : répondre, reconnaître ma défaite ou annuler" } },
                onClick = function()
                    onAct(duel)
                end,
            } or nil)
        rows[#rows + 1] = row("line", ("%s · %s · %s"):format(date(DATE, duel.scheduledAt), duel.place,
            duelState(data, duel)))
        if duel.betId ~= nil and duel.status == "scheduled" then
            rows[#rows + 1] = row("line", "Pari ouvert : Le Dé Pipé › Paris, ou le site")
        end
    end
    return rows
end

--- The duels' Elo board for the core's ranking board (VXV.RankingBoard), for the player of member id: { empty (why
--- nobody shows, or nil), podium, rest, mine, widest, unit, metric, recordsTitle, records }.
function PvpView.Board(data, memberId)
    local view = { podium = {}, rest = {}, records = {}, widest = 0, unit = "points", metric = "Elo · depuis toujours",
        recordsTitle = "Records des duels" }
    if data == nil then
        view.empty = NO_DATA
        return view
    end
    for _, entry in ipairs(data.ranking) do
        local player = data.players[entry.memberId] or {}
        local line = { rank = entry.rank, value = entry.rating, name = player.name or "?", class = player.class,
            avatar = player.avatar }
        local list = #view.podium < PODIUM and view.podium or view.rest
        list[#list + 1] = line
        view.mine = entry.memberId == memberId and line or view.mine
        view.widest = math.max(view.widest, math.abs(entry.rating))
    end
    for _, record in ipairs(data.records) do
        local player = data.players[record.memberId] or {}
        view.records[#view.records + 1] = { label = record.label, value = record.value, name = player.name or "?",
            class = player.class }
    end
    view.empty = #view.podium == 0 and NO_RANKING or nil
    return view
end
