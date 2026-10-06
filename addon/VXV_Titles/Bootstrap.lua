local _, ns = ...

VXV.RegisterModule({
    id = "titres",
    name = "Titres",
    Enable = function(data)
        ns.TitlesData.Restore(data)
        ns.Display.Start()
    end,
    tab = {
        place = "ranking",
        name = "Titres",
        order = 3,
        Build = ns.RankingTab.Build,
        Compact = ns.RankingTab.Compact,
    },
})
