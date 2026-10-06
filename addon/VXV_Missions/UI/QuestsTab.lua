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

local content, subtitle
local lists = {}

local function render()
    local data, now = QuestsData.Current(), time()
    subtitle:SetText(QuestsView.Subtitle(data))
    lists.board.SetRows(QuestsView.Board(data, now))
    lists.others.SetRows(QuestsView.Others(data, now))
    lists.fame.SetRows(QuestsView.HallOfFame(data))
end

function QuestsTab.Build(frame)
    content = frame
    local kicker, title = Theme.ScreenHeader(content, "Le tableau des quêtes", "gain", "Quêtes")
    kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    subtitle = Theme.Text(content, "text", 13, "muted")
    subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local boardWidth = width - 2 * PADDING - RIGHT - GAP
    lists.board = RowList.Panel(content, PADDING, GRID_TOP, boardWidth, height, "Quête de la semaine", "parchment")
    local x = PADDING + boardWidth + GAP
    local othersHeight = math.floor(height * OTHERS_SHARE)
    lists.others = RowList.Panel(content, x, GRID_TOP, RIGHT, othersHeight, "À venir et terminées")
    local fameTop = GRID_TOP + othersHeight + GAP
    lists.fame = RowList.Panel(content, x, fameTop, RIGHT, height - othersHeight - GAP, "Hall of fame")
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
