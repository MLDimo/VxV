local _, ns = ...

--- The Ranking's Titres tab (§7.5): the titles of the week with their holders and rules; and the Ranking's tab in the
--- reduced mode (§7.8).
local RankingTab = {}
ns.RankingTab = RankingTab

local TitlesData, TitlesView = ns.TitlesData, ns.TitlesView
local Screen = VXV.Screen

local UPDATED = "titres.updated"

function RankingTab.Build(frame)
    Screen.List(frame, {
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
    Screen.Compact(frame, function()
        return TitlesView.Week(TitlesData.Current())
    end, { UPDATED })
end
