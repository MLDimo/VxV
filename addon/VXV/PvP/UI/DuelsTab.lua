local ns = select(2, ...).PvP

--- The PvP place's « Duels » tab, as the Ranking: the Elo's first three on banners and the duels' records on the left;
--- on the right the duels (where a member challenges another) and the following places with the player's own.
local DuelsTab = {}
ns.DuelsTab = DuelsTab

local DuelActions, DuelDialog, PvpData, PvpView = ns.DuelActions, ns.DuelDialog, ns.PvpData, ns.PvpView
local RankingBoard, RowList, Screen, Theme = VXV.RankingBoard, VXV.RowList, VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
-- The left column's share of the width, as the Ranking's; the duels' share of the right column's height.
local LEFT_SHARE, DUELS_SHARE = 1.2 / 2.2, 0.5
local RECORDS_HEIGHT = 118

function DuelsTab.Build(content)
    local header = Screen.Head(content, "Avis de recherche", "loss", "Duels")
    local badges = Screen.Badges(content)
    local width, height = content:GetWidth() - 2 * PADDING, content:GetHeight()
    local left = math.floor((width - GAP) * LEFT_SHARE)
    local right, x = width - left - GAP, PADDING + left + GAP
    local columnHeight = height - GRID_TOP - PADDING
    local duelsHeight = math.floor((columnHeight - GAP) * DUELS_SHARE)
    local board = {
        RankingBoard.Podium(content, PADDING, GRID_TOP, left),
        RankingBoard.Records(content, PADDING, height - PADDING - RECORDS_HEIGHT, left, RECORDS_HEIGHT),
        RankingBoard.Rest(content, x, GRID_TOP + duelsHeight + GAP, right, columnHeight - duelsHeight - GAP),
    }
    local panel, body = Theme.TitledPanel(content, x, GRID_TOP, right, duelsHeight, "Duels")
    local duels = RowList.Create(body, 0)
    Theme.TitleButton(panel, "Défier", DuelDialog.Open, "gold")
    Screen.Follow(content, function()
        local data = PvpData.Current()
        local memberId = VXV.MemberOf(data)
        local view = PvpView.Header(data, memberId)
        local elo = PvpView.Board(data, memberId)
        header.subtitle:SetText(elo.empty or view.subtitle)
        badges.Set(view.badges)
        for _, part in ipairs(board) do
            part.Set(elo)
        end
        duels.SetRows(PvpView.Duels(data, memberId, DuelActions.Open))
    end, { "pvp.updated", "pvp.changes" })
end
