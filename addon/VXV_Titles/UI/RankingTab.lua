local _, ns = ...

--- The Ranking's Titres tab (§7.5): the titles of the week with their holders and rules; and the Ranking's tab in the
--- reduced mode (§7.8).
local RankingTab = {}
ns.RankingTab = RankingTab

local TitlesData, TitlesView = ns.TitlesData, ns.TitlesView
local RowList = VXV.RowList

local COMPACT_PADDING = 10
local UPDATED = "titres.updated"

function RankingTab.Build(frame)
    RowList.Screen(frame, {
        place = "ranking",
        heading = "Titres de la semaine",
        subtitle = function()
            return TitlesView.Subtitle(TitlesData.Current())
        end,
        rows = function()
            return TitlesView.Week(TitlesData.Current())
        end,
        events = { UPDATED },
    })
end

function RankingTab.Compact(frame)
    RowList.Fill(frame, COMPACT_PADDING, function()
        return TitlesView.Week(TitlesData.Current())
    end, { UPDATED })
end
