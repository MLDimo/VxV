local ns = select(2, ...).Ranking

--- The Ranking's screen (§7.5, docs/design/maquettes/AddonClassement.html): its categories and periods, the first
--- three on banners hanging from a rod, the period's records under them, and on the right the following places with
--- the player's own at the bottom; and its reduced mode (§7.8).
local RankingTab = {}
ns.RankingTab = RankingTab

local RankingData, RankingView = ns.RankingData, ns.RankingView
local RankingBoard, Screen, Theme = VXV.RankingBoard, VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local UPDATED = "ranking.updated"
-- The left column's share of the width (podium and records), as in the mockup (1.2fr | 1fr).
local LEFT_SHARE = 1.2 / 2.2
local RECORDS_HEIGHT, TITLE_GAP = 118, 18
local CATEGORY_GAP, PERIOD_HEIGHT, PERIOD_PADDING, PERIOD_WIDTH = 4, 28, 2, 76

local state = { category = "paris" }
local content, head, board, categoryTabs, periodButtons

local function currentPeriod(data)
    return state.period or ((data and data.season or 0) > 0 and "season" or "always")
end

local function render()
    local data = RankingData.Current()
    local period = currentPeriod(data)
    local view = RankingView.Board(data, state.category, period, VXV.MemberOf(data))
    head.subtitle:SetText(view.empty or "")
    for _, tab in ipairs(categoryTabs) do
        tab:SetSelected(tab.category == state.category)
    end
    for _, button in ipairs(periodButtons) do
        local selected = button.period == period
        button.background:SetShown(selected)
        button.label:SetTextColor(Theme.Color(selected and "banner-ink" or "old-paper"))
        button.label:SetText(RankingView.PeriodLabel(data, button.period))
    end
    for _, part in pairs(board) do
        part.Set(view)
    end
end

local function addCategories()
    categoryTabs = {}
    local previous
    for _, category in ipairs(RankingView.CATEGORIES) do
        local tab = Theme.Tab(content, category.name)
        tab.category = category.id
        if previous == nil then
            tab:SetPoint("BOTTOMLEFT", head.title, "BOTTOMRIGHT", TITLE_GAP, 0)
        else
            tab:SetPoint("LEFT", previous, "RIGHT", CATEGORY_GAP, 0)
        end
        tab:SetScript("OnClick", function()
            state.category = category.id
            render()
        end)
        categoryTabs[#categoryTabs + 1] = tab
        previous = tab
    end
end

local function addPeriods()
    local group = CreateFrame("Frame", nil, content)
    group:SetSize(#RankingView.PERIODS * PERIOD_WIDTH + 2 * PERIOD_PADDING, PERIOD_HEIGHT + 2 * PERIOD_PADDING)
    group:SetPoint("BOTTOMRIGHT", content, "TOPRIGHT", -PADDING, -GRID_TOP + GAP)
    Theme.Fill(group, "wood-night"):SetAllPoints()
    Theme.Rings(group, { { "ink", 2 }, { "beam", 2 } })
    periodButtons = {}
    for index, period in ipairs(RankingView.PERIODS) do
        local button = CreateFrame("Button", nil, group)
        button:SetSize(PERIOD_WIDTH, PERIOD_HEIGHT)
        button:SetPoint("TOPLEFT", PERIOD_PADDING + (index - 1) * PERIOD_WIDTH, -PERIOD_PADDING)
        button.background = Theme.Fill(button, "gold")
        button.background:SetAllPoints()
        button.label = Theme.Text(button, "textBold", 12, "old-paper")
        button.label:SetPoint("CENTER")
        button.period = period
        button:SetScript("OnClick", function()
            state.period = period
            render()
        end)
        periodButtons[index] = button
    end
end

function RankingTab.Build(frame)
    content = frame
    local place = Screen.Place("ranking") or {}
    head = Screen.Head(content, place.subtitle, place.kicker, place.name)
    addCategories()
    addPeriods()
    local width, height = content:GetWidth() - 2 * PADDING, content:GetHeight()
    local left = math.floor((width - GAP) * LEFT_SHARE)
    local right = width - left - GAP
    board = {
        podium = RankingBoard.Podium(content, PADDING, GRID_TOP, left),
        records = RankingBoard.Records(content, PADDING, height - PADDING - RECORDS_HEIGHT, left, RECORDS_HEIGHT),
        rest = RankingBoard.Rest(content, PADDING + left + GAP, GRID_TOP, right, height - GRID_TOP - PADDING),
    }
    Screen.Follow(content, render, { UPDATED })
end

--- The reduced mode: the places of the board chosen on the screen.
function RankingTab.Compact(frame)
    Screen.Compact(frame, function()
        local data = RankingData.Current()
        return RankingView.Rows(RankingView.Board(data, state.category, currentPeriod(data), VXV.MemberOf(data)))
    end, { UPDATED })
end

--- The Taverne's card: the board's first.
function RankingTab.Card()
    local data = RankingData.Current()
    local view = RankingView.Board(data, "paris", currentPeriod(data), VXV.MemberOf(data))
    local first = view.podium[1]
    if first == nil then
        return { title = "Au-dessus de la cheminée", lines = { view.empty }, action = "Voir" }
    end
    return {
        title = VXV.ClassColored(first.name, first.class),
        lines = { ("1er des parieurs · %s"):format(RankingView.Value(view.unit, first.value, true)), view.metric },
        action = "Voir",
    }
end
