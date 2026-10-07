local _, ns = ...

--- Le Dé Pipé's screen (§7.2): the head with the player's debt, the open bets on the gaming table, then the
--- player's bets and the guild's cash (the bettors' ranking is in Ranking).
local DiceTab = {}
ns.DiceTab = DiceTab

local Bets, BetsData, DiceView, StakeDialog = ns.Bets, ns.BetsData, ns.DiceView, ns.StakeDialog
local RowList, Screen = VXV.RowList, VXV.Screen

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local RIGHT = 340
-- The right column's panels: the player's bets take this share of its height, the cash the rest.
local MINE_SHARE = 0.5

local content, header, badges
local lists = {}

local function renderHeader(data, memberId)
    local view = DiceView.Header(data, memberId)
    header.subtitle:SetText(view.subtitle)
    badges.Set(view.badges)
end

local function render()
    local data = BetsData.Current()
    local memberId = VXV.MemberOf(data)
    renderHeader(data, memberId)
    lists.table.SetRows(DiceView.Table(data, memberId, time(), StakeDialog.Open))
    lists.mine.SetRows(DiceView.MyStakes(data, memberId))
    lists.cash.SetRows(DiceView.Cash(data))
end

function DiceTab.Build(frame)
    content = frame
    header = Screen.Head(content, "La salle de jeu", "neon", "Le Dé Pipé")
    badges = Screen.Badges(content)

    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local tableWidth = width - 2 * PADDING - RIGHT - GAP
    lists.table = RowList.Panel(content, PADDING, GRID_TOP, tableWidth, height, "La table de jeu")
    local x = PADDING + tableWidth + GAP
    local mineHeight = math.floor(height * MINE_SHARE)
    lists.mine = RowList.Panel(content, x, GRID_TOP, RIGHT, mineHeight, "Mes paris")
    lists.cash = RowList.Panel(content, x, GRID_TOP + mineHeight + GAP, RIGHT, height - mineHeight - GAP, "La caisse")
    -- What depends on the time (the closing of the bets) is up to date each time the screen shows.
    Screen.Follow(content, render, { "paris.updated", "paris.changes" })
end
