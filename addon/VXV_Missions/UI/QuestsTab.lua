local _, ns = ...

--- The Quêtes screen (§7.4): the running quest on its parchment, the quests to come and the ended ones, and the
--- hall of fame.
local QuestsTab = {}
ns.QuestsTab = QuestsTab

local QuestsData, QuestsView = ns.QuestsData, ns.QuestsView
local RowList, Screen = VXV.RowList, VXV.Screen

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local RIGHT = 340
local OTHERS_SHARE = 0.45

local head
local lists = {}

local function render()
    local data, now = QuestsData.Current(), time()
    head.subtitle:SetText(QuestsView.Subtitle(data))
    lists.board.SetRows(QuestsView.Board(data, now))
    lists.others.SetRows(QuestsView.Others(data, now))
    lists.fame.SetRows(QuestsView.HallOfFame(data))
end

function QuestsTab.Build(content)
    head = Screen.Head(content, "Le tableau des quêtes", "gain", "Quêtes")
    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local boardWidth = width - 2 * PADDING - RIGHT - GAP
    lists.board = RowList.Panel(content, PADDING, GRID_TOP, boardWidth, height, "Quête de la semaine", "parchment")
    local x = PADDING + boardWidth + GAP
    local othersHeight = math.floor(height * OTHERS_SHARE)
    lists.others = RowList.Panel(content, x, GRID_TOP, RIGHT, othersHeight, "À venir et terminées")
    local fameTop = GRID_TOP + othersHeight + GAP
    lists.fame = RowList.Panel(content, x, fameTop, RIGHT, height - othersHeight - GAP, "Hall of fame")
    Screen.Follow(content, render, { "quetes.updated", "quetes.live" })
end
