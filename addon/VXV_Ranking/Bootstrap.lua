local _, ns = ...

VXV.RegisterModule({
    id = "ranking",
    name = "Ranking",
    Enable = function(data)
        ns.RankingData.Restore(data)
    end,
    tab = {
        place = "ranking",
        Build = ns.RankingTab.Build,
        Card = ns.RankingTab.Card,
        Compact = ns.RankingTab.Compact,
    },
})

-- The Taverne's card follows the boards.
VXV.On("ranking.updated", function()
    VXV.Emit("tavern.changed")
end)
