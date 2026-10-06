local _, ns = ...

--- The Quêtes screen (§7.4): the running quest on its parchment, the quests to come and the ended ones, and the
--- hall of fame.
local QuestsTab = {}
ns.QuestsTab = QuestsTab

local QuestsData, QuestsView = ns.QuestsData, ns.QuestsView
local RowList = VXV.RowList

local Theme = VXV.Theme

local PADDING, GAP = 22, 16
local GRID_TOP = 96
local RIGHT = 340
local OTHERS_SHARE = 0.45
local PANEL_PADDING, PANEL_TITLE = 14, 40

local content, subtitle
local lists = {}

local function render()
    local data, now = QuestsData.Current(), time()
    subtitle:SetText(QuestsView.Subtitle(data))
    lists.board.SetRows(QuestsView.Board(data, now))
    lists.others.SetRows(QuestsView.Others(data, now))
    lists.fame.SetRows(QuestsView.HallOfFame(data))
end

--- A panel with its title and a list; the parchment one (§7.4) for the quest of the week.
local function addPanel(x, y, width, height, title, parchment)
    local panel = Theme.Panel(content)
    panel:SetPoint("TOPLEFT", x, -y)
    panel:SetSize(width, height)
    if parchment then
        Theme.Fill(panel, "parchment", "BORDER"):SetAllPoints()
    end
    local heading = Theme.Text(panel, "pixel", 16, parchment and "ink-brown" or "ivory")
    heading:SetPoint("TOPLEFT", PANEL_PADDING, -12)
    heading:SetText(title)
    local body = CreateFrame("Frame", nil, panel)
    body:SetPoint("TOPLEFT", PANEL_PADDING, -PANEL_TITLE)
    body:SetSize(width - 2 * PANEL_PADDING, height - PANEL_TITLE - PANEL_PADDING)
    return RowList.Create(body, 0, parchment and "parchment" or nil)
end

function QuestsTab.Build(frame)
    content = frame
    local kicker, title = Theme.ScreenHeader(content, "Le tableau des quêtes", "gain", "Quêtes")
    kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    subtitle = Theme.Text(content, "text", 13, "muted")
    subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local boardWidth = width - 2 * PADDING - RIGHT - GAP
    lists.board = addPanel(PADDING, GRID_TOP, boardWidth, height, "Quête de la semaine", true)
    local x = PADDING + boardWidth + GAP
    local othersHeight = math.floor(height * OTHERS_SHARE)
    lists.others = addPanel(x, GRID_TOP, RIGHT, othersHeight, "À venir et terminées")
    lists.fame = addPanel(x, GRID_TOP + othersHeight + GAP, RIGHT, height - othersHeight - GAP, "Hall of fame")
    content:SetScript("OnShow", render)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("quetes.updated", refresh)
VXV.On("quetes.live", refresh)
