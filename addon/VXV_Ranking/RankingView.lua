local _, ns = ...

--- What the Ranking's screen shows (§7.5) of the website's boards: its categories and periods, then a board's podium,
--- records and other places, and the player's own; built from the data alone, so that it can be checked without
--- the interface.
local RankingView = {}
ns.RankingView = RankingView

RankingView.CATEGORIES = {
    { id = "paris", name = "Paris" },
    { id = "deathroll", name = "Deathroll" },
    { id = "quetes", name = "Quêtes" },
    { id = "titres", name = "Titres" },
}
RankingView.PERIODS = { "always", "month", "season" }
RankingView.PODIUM = 3

local PERIOD_LABELS = { always = "Toujours", month = "Mois", season = "Saison" }
local RECORDS_TITLES = {
    always = "Records depuis toujours",
    month = "Records du mois",
    season = "Records de la saison",
}
local NO_DATA = "Aucun classement : ton compagnon VXV l'apporte, ou un officier le transmet à la guilde."
local NOBODY = "Personne au classement sur cette période."

--- "Toujours", "Mois", "Saison 2".
function RankingView.PeriodLabel(data, period)
    local season = data and data.season or 0
    if period == "season" and season > 0 then
        return PERIOD_LABELS.season .. " " .. season
    end
    return PERIOD_LABELS[period]
end

--- A value as the board writes it: gold with its sign ("+3 215 po" on the banners, "+310" below), or a count.
RankingView.Value = VXV.RankingBoard.Value

local function lineOf(data, row, memberId)
    local member = data.members[row.memberId] or {}
    return { rank = row.rank, value = row.value, name = member.name or "?", class = member.class,
        avatar = member.avatar, title = member.title, mine = row.memberId == memberId }
end

--- A category's board over a period, for the player of member id: { empty (why nothing shows, or nil), metric,
--- unit, podium (the first three lines), rest (the others), mine (the player's line, or nil), widest (the biggest
--- value, for the bars), recordsTitle, records ({ label, value, name, class }) }. A line: { rank, value, name, class,
--- avatar, title, mine }.
function RankingView.Board(data, category, period, memberId)
    local board = data and data.boards[category .. "|" .. period]
    local view = { podium = {}, rest = {}, records = {}, widest = 0, recordsTitle = RECORDS_TITLES[period],
        metric = (board and board.metric or "") .. " · " .. RankingView.PeriodLabel(data, period),
        unit = board and board.unit or "count" }
    if data == nil then
        view.empty = NO_DATA
        return view
    end
    for _, row in ipairs(board and board.rows or {}) do
        local line = lineOf(data, row, memberId)
        local list = #view.podium < RankingView.PODIUM and view.podium or view.rest
        list[#list + 1] = line
        view.mine = line.mine and line or view.mine
        view.widest = math.max(view.widest, math.abs(row.value))
    end
    for _, record in ipairs(board and board.records or {}) do
        local member = data.members[record.memberId] or {}
        view.records[#view.records + 1] = { label = record.label, value = record.value, name = member.name or "?",
            class = member.class }
    end
    view.empty = #view.podium == 0 and NOBODY or nil
    return view
end

--- The reduced mode's rows: each place of the board, as text.
function RankingView.Rows(view)
    local rows = {}
    for _, list in ipairs({ view.podium, view.rest }) do
        for _, line in ipairs(list) do
            rows[#rows + 1] = VXV.RowList.Row("line", ("%d. %s  %s"):format(line.rank,
                VXV.ClassColored(line.name, line.class), RankingView.Value(view.unit, line.value, true)))
        end
    end
    if #rows == 0 then
        rows[1] = VXV.RowList.Row("line", view.empty)
    end
    return rows
end
