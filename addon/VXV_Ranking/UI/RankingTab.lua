local _, ns = ...

--- The Ranking's screen (§7.5, docs/design/maquettes/AddonClassement.html): its categories and periods, the first
--- three on banners hanging from a rod, the period's records under them, and on the right the following places with
--- the player's own at the bottom; and its reduced mode (§7.8).
local RankingTab = {}
ns.RankingTab = RankingTab

local Banner, RankingData, RankingView = ns.Banner, ns.RankingData, ns.RankingView
local Screen, Theme = VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local UPDATED = "ranking.updated"
-- The left column's share of the width (podium and records), as in the mockup (1.2fr | 1fr).
local LEFT_SHARE = 1.2 / 2.2
local ROD_HEIGHT, CAP_WIDTH, CAP_HEIGHT, RING_WIDTH, RING_HEIGHT, RING_INSET = 10, 14, 18, 10, 14, 26
local BANNER_GAP, BANNER_TOP = 18, 10
-- Second, first, third, as on a podium.
local PODIUM_ORDER = { 2, 1, 3 }
local RECORDS_HEIGHT, RECORD_GAP, RECORD_PADDING = 118, 8, 8
local ROW_HEIGHT, ROW_GAP, AVATAR, BAR_WIDTH, BAR_HEIGHT, VALUE_WIDTH, RANK_WIDTH = 42, 6, 32, 80, 6, 64, 24
local ROW_PADDING, ROW_SPACE = 8, 10
local CATEGORY_GAP, PERIOD_HEIGHT, PERIOD_PADDING, PERIOD_WIDTH = 4, 28, 2, 76

local state = { category = "paris" }
local content, head, banners, recordsTitle, metric, records, rows, mine, categoryTabs, periodButtons
local offset = 0

local function currentPeriod(data)
    return state.period or ((data and data.season or 0) > 0 and "season" or "always")
end

--- A place below the podium: rank, portrait in a ring of its class color, name and title, bar, value.
local function createRow(parent, own)
    local row = CreateFrame("Frame", nil, parent)
    row:SetHeight(ROW_HEIGHT)
    row.background = row:CreateTexture(nil, "BACKGROUND")
    row.background:SetAllPoints()
    row.ring = Theme.Rings(row, { { own and "amethyst" or "line", own and 2 or 1 } }, true)[1]
    row.rank = Theme.Text(row, "pixel", 15, own and "amethyst-light" or "muted")
    row.rank:SetPoint("LEFT", ROW_PADDING, 0)
    row.avatar = CreateFrame("Frame", nil, row)
    row.avatar:SetSize(AVATAR, AVATAR)
    row.avatar:SetPoint("LEFT", ROW_PADDING + RANK_WIDTH + ROW_SPACE, 0)
    Theme.Fill(row.avatar, "avatar-ground", "ARTWORK"):SetAllPoints()
    row.picture = row.avatar:CreateTexture(nil, "OVERLAY")
    row.picture:SetAllPoints()
    row.frame = Theme.Rings(row.avatar, { { "line", 2 } })[1]
    row.value = Theme.Text(row, "pixel", 15, "gain")
    row.value:SetPoint("RIGHT", -ROW_PADDING, 0)
    row.value:SetWidth(VALUE_WIDTH)
    row.value:SetJustifyH("RIGHT")
    row.bar = row:CreateTexture(nil, "ARTWORK")
    row.bar:SetSize(BAR_WIDTH, BAR_HEIGHT)
    row.bar:SetPoint("RIGHT", row.value, "LEFT", -ROW_SPACE, 0)
    row.bar:SetColorTexture(Theme.Color("line"))
    row.fill = row:CreateTexture(nil, "OVERLAY")
    row.fill:SetHeight(BAR_HEIGHT)
    row.fill:SetPoint("LEFT", row.bar, "LEFT")
    row.name = Theme.Text(row, "textBold", 14, "ivory")
    row.name:SetPoint("TOPLEFT", row.avatar, "TOPRIGHT", ROW_SPACE, 0)
    row.name:SetPoint("RIGHT", row.bar, "LEFT", -ROW_SPACE, 0)
    row.title = Theme.Text(row, "text", 11, own and "muted" or "sakura-light")
    row.title:SetPoint("BOTTOMLEFT", row.avatar, "BOTTOMRIGHT", ROW_SPACE, 0)

    function row:Set(line, view, index)
        local positive = line.value >= 0
        row.background:SetColorTexture(Theme.Color(own and "amethyst" or (index % 2 == 1 and "amethyst" or "night")))
        row.background:SetAlpha(own and 0.16 or (index % 2 == 1 and 0.06 or 0.4))
        row.rank:SetText(line.rank)
        row.picture:SetTexture(Banner.Avatar(line.avatar), nil, nil, "NEAREST")
        Theme.Recolor(row.frame, "line")
        if line.class ~= nil then
            for _, edge in ipairs(row.frame) do
                edge:SetColorTexture(Theme.ClassColor(line.class))
            end
        end
        local name = VXV.ClassColored(line.name, line.class)
        row.name:SetText(own and ("Toi · " .. name) or name)
        row.title:SetText(own and "ta position" or (line.title ~= nil and ("◆ " .. line.title) or ""))
        local share = view.widest > 0 and math.abs(line.value) / view.widest or 0
        row.fill:SetWidth(math.max(1, BAR_WIDTH * share))
        row.fill:SetColorTexture(Theme.Color(positive and "gain" or "loss"))
        row.value:SetTextColor(Theme.Color(positive and "gain" or "loss"))
        row.value:SetText(RankingView.Value(view.unit, line.value, false))
        row:Show()
    end

    return row
end

local function renderRecords(view)
    recordsTitle:SetText(view.recordsTitle)
    for index, box in ipairs(records) do
        local record = view.records[index]
        box:SetShown(record ~= nil)
        if record ~= nil then
            box.label:SetText(Theme.Upper(record.label))
            box.value:SetText(record.value)
            box.who:SetText(VXV.ClassColored(record.name, record.class))
        end
    end
end

local function renderRest(view)
    local visible = #rows
    offset = math.max(0, math.min(offset, #view.rest - visible))
    for index, row in ipairs(rows) do
        local line = view.rest[offset + index]
        if line == nil then
            row:Hide()
        else
            row:Set(line, view, offset + index)
        end
    end
    if view.mine == nil then
        mine:Hide()
    else
        mine:Set(view.mine, view, 1)
    end
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
    for place, banner in ipairs(banners) do
        local line = view.podium[place]
        if line == nil then
            banner:Hide()
        else
            banner:Set(place, line, view.unit)
        end
    end
    metric:SetText(view.metric)
    renderRecords(view)
    renderRest(view)
end

local function addCategories()
    categoryTabs = {}
    local previous
    for _, category in ipairs(RankingView.CATEGORIES) do
        local tab = Theme.Tab(content, category.name)
        tab.category = category.id
        if previous == nil then
            tab:SetPoint("BOTTOMLEFT", head.title, "BOTTOMRIGHT", BANNER_GAP, 0)
        else
            tab:SetPoint("LEFT", previous, "RIGHT", CATEGORY_GAP, 0)
        end
        tab:SetScript("OnClick", function()
            state.category, offset = category.id, 0
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
            state.period, offset = period, 0
            render()
        end)
        periodButtons[index] = button
    end
end

local function addPodium(width)
    local rod = CreateFrame("Frame", nil, content)
    rod:SetPoint("TOPLEFT", PADDING, -GRID_TOP)
    rod:SetSize(width, ROD_HEIGHT)
    Theme.Fill(rod, "beam"):SetAllPoints()
    Theme.Rings(rod, { { "ink", 2 } })
    for _, side in ipairs({ "LEFT", "RIGHT" }) do
        local cap = Theme.Fill(rod, "gold", "ARTWORK")
        cap:SetSize(CAP_WIDTH, CAP_HEIGHT)
        cap:SetPoint("TOP" .. side, rod, "TOP" .. side, 0, (CAP_HEIGHT - ROD_HEIGHT) / 2)
    end
    banners = {}
    local podiumWidth = #PODIUM_ORDER * Banner.WIDTH + (#PODIUM_ORDER - 1) * BANNER_GAP
    for column, place in ipairs(PODIUM_ORDER) do
        local banner = Banner.Create(content)
        local x = PADDING + (width - podiumWidth) / 2 + (column - 1) * (Banner.WIDTH + BANNER_GAP)
        banner:SetPoint("TOPLEFT", x, -GRID_TOP - BANNER_TOP)
        for _, side in ipairs({ "LEFT", "RIGHT" }) do
            local ring = Theme.Fill(banner, "copper", "OVERLAY")
            ring:SetSize(RING_WIDTH, RING_HEIGHT)
            ring:SetPoint("TOP" .. side, banner, "TOP" .. side, side == "LEFT" and RING_INSET or -RING_INSET,
                BANNER_TOP)
        end
        banners[place] = banner
    end
end

local function addRecords(width)
    local panel, body
    panel, body, recordsTitle = Theme.TitledPanel(content, PADDING, content:GetHeight() - PADDING - RECORDS_HEIGHT,
        width, RECORDS_HEIGHT, "")
    local boxWidth = (body:GetWidth() - 2 * RECORD_GAP) / 3
    records = {}
    for index = 1, 3 do
        local box = CreateFrame("Frame", nil, body)
        box:SetPoint("TOPLEFT", (index - 1) * (boxWidth + RECORD_GAP), 0)
        box:SetSize(boxWidth, body:GetHeight())
        local ground = Theme.Fill(box, "night")
        ground:SetAllPoints()
        ground:SetAlpha(0.55)
        Theme.Rings(box, { { "line", 1 } }, true)
        box.label = Theme.Text(box, "textHeavy", 10, "muted")
        box.label:SetPoint("TOPLEFT", RECORD_PADDING, -RECORD_PADDING)
        box.value = Theme.Text(box, "pixelBold", 17, "gold")
        box.value:SetPoint("TOPLEFT", box.label, "BOTTOMLEFT", 0, -4)
        box.who = Theme.Text(box, "textBold", 12, "lavender")
        box.who:SetPoint("TOPLEFT", box.value, "BOTTOMLEFT", 0, -4)
        records[index] = box
    end
    return panel
end

local function addRest(x, width)
    local height = content:GetHeight() - GRID_TOP - PADDING
    local panel, body = Theme.TitledPanel(content, x, GRID_TOP, width, height, "Suite du classement")
    metric = Theme.Text(panel, "textBold", 11, "muted")
    metric:SetPoint("TOPRIGHT", -Theme.PANEL_PADDING, -Theme.PANEL_PADDING)
    mine = createRow(body, true)
    mine:SetPoint("BOTTOMLEFT")
    mine:SetPoint("BOTTOMRIGHT")
    rows = {}
    local visible = math.max(1, math.floor((body:GetHeight() - ROW_HEIGHT - GAP + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)))
    for index = 1, visible do
        local row = createRow(body, false)
        row:SetPoint("TOPLEFT", 0, -(index - 1) * (ROW_HEIGHT + ROW_GAP))
        row:SetPoint("RIGHT")
        rows[index] = row
    end
    body:EnableMouseWheel(true)
    body:SetScript("OnMouseWheel", function(_, delta)
        offset = offset - delta
        render()
    end)
end

function RankingTab.Build(frame)
    content = frame
    local place = Screen.Place("ranking") or {}
    head = Screen.Head(content, place.subtitle, place.kicker, place.name)
    addCategories()
    addPeriods()
    local width = content:GetWidth() - 2 * PADDING
    local left = math.floor((width - GAP) * LEFT_SHARE)
    addPodium(left)
    addRecords(left)
    addRest(PADDING + left + GAP, width - left - GAP)
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
