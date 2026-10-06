local _, ns = ...

--- Le Dé Pipé's screen (§7.2): the head with the player's debt, the open bets on the gaming table, then the
--- player's bets, the bettors' ranking and the guild's cash.
local DiceTab = {}
ns.DiceTab = DiceTab

local Bets, BetsData, DiceView, StakeDialog = ns.Bets, ns.BetsData, ns.DiceView, ns.StakeDialog
local RowList = VXV.RowList

local Theme = VXV.Theme

local PADDING, GAP = 22, 16
local GRID_TOP = 96
local RIGHT = 340
-- The right column's panels, by their share of its height.
local MINE_SHARE, RANKING_SHARE = 0.34, 0.33
local PANEL_PADDING, PANEL_TITLE = 14, 40
local BADGE_HEIGHT, BADGE_PADDING, BADGE_GAP, BADGE_ALPHA = 24, 16, 6, 0.14

local content, header
local lists, badges = {}, {}

local function addBadge(index)
    local badge = CreateFrame("Frame", nil, content)
    badge:SetHeight(BADGE_HEIGHT)
    badge.background = badge:CreateTexture(nil, "BACKGROUND")
    badge.background:SetAllPoints()
    badge.label = Theme.Text(badge, "textHeavy", 12, "gain")
    badge.label:SetPoint("CENTER")
    badges[index] = badge
    return badge
end

local function renderHeader(data, memberId)
    local view = DiceView.Header(data, memberId)
    header.subtitle:SetText(view.subtitle)
    local right = -PADDING
    for index, item in ipairs(view.badges) do
        local badge = badges[index] or addBadge(index)
        local r, g, b = Theme.Color(item.color)
        badge.background:SetColorTexture(r, g, b, BADGE_ALPHA)
        badge.label:SetTextColor(r, g, b, 1)
        badge.label:SetText(item.text)
        badge:SetWidth(badge.label:GetStringWidth() + BADGE_PADDING)
        badge:ClearAllPoints()
        badge:SetPoint("TOPRIGHT", right, -PADDING)
        right = right - badge:GetWidth() - BADGE_GAP
    end
end

local function render()
    local data = BetsData.Current()
    local memberId = Bets.MemberId(data)
    renderHeader(data, memberId)
    lists.table.SetRows(DiceView.Table(data, memberId, time(), StakeDialog.Open))
    lists.mine.SetRows(DiceView.MyStakes(data, memberId))
    lists.ranking.SetRows(DiceView.Ranking(data))
    lists.cash.SetRows(DiceView.Cash(data))
end

--- A panel of the grid with its title, and a list under it.
local function addPanel(x, y, width, height, title)
    local panel = Theme.Panel(content)
    panel:SetPoint("TOPLEFT", x, -y)
    panel:SetSize(width, height)
    local heading = Theme.Text(panel, "pixel", 16, "ivory")
    heading:SetPoint("TOPLEFT", PANEL_PADDING, -12)
    heading:SetText(title)
    local body = CreateFrame("Frame", nil, panel)
    body:SetPoint("TOPLEFT", PANEL_PADDING, -PANEL_TITLE)
    body:SetSize(width - 2 * PANEL_PADDING, height - PANEL_TITLE - PANEL_PADDING)
    return RowList.Create(body)
end

function DiceTab.Build(frame)
    content = frame
    header = {}
    header.kicker, header.title = Theme.ScreenHeader(content, "La salle de jeu", "neon", "Le Dé Pipé")
    header.kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    header.subtitle = Theme.Text(content, "text", 13, "muted")
    header.subtitle:SetPoint("TOPLEFT", header.title, "BOTTOMLEFT", 0, -6)

    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local tableWidth = width - 2 * PADDING - RIGHT - GAP
    lists.table = addPanel(PADDING, GRID_TOP, tableWidth, height, "La table de jeu")
    local x = PADDING + tableWidth + GAP
    local mineHeight = math.floor(height * MINE_SHARE)
    local rankingHeight = math.floor(height * RANKING_SHARE)
    local cashHeight = height - mineHeight - rankingHeight - 2 * GAP
    lists.mine = addPanel(x, GRID_TOP, RIGHT, mineHeight, "Mes paris")
    lists.ranking = addPanel(x, GRID_TOP + mineHeight + GAP, RIGHT, rankingHeight, "Classement")
    lists.cash = addPanel(x, GRID_TOP + mineHeight + rankingHeight + 2 * GAP, RIGHT, cashHeight, "La caisse")
    -- What depends on the time (the closing of the bets) is up to date each time the screen shows.
    content:SetScript("OnShow", render)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("paris.updated", refresh)
VXV.On("paris.changes", refresh)
