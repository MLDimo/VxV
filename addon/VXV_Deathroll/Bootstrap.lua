local _, ns = ...

VXV.RegisterModule({
    id = "deathroll",
    name = "Deathroll",
    Enable = function(data)
        ns.DeathrollData.Restore(data)
        ns.Games.Restore(data)
    end,
    tab = {
        place = "dice",
        name = "Deathroll",
        order = 2,
        Build = ns.DeathrollTab.Build,
    },
})

-- The deathroll's ranking, as the Ranking's second tab (P15.7).
VXV.RegisterModule({
    id = "deathroll-classement",
    name = "Classement du deathroll",
    tab = {
        place = "ranking",
        name = "Deathroll",
        order = 2,
        Build = function(frame)
            VXV.Screen.List(frame, {
                place = "ranking",
                heading = "Classement du deathroll",
                subtitle = function()
                    return "Gain net de chacun sur les parties finies, depuis toujours."
                end,
                rows = ns.DeathrollTab.Ranking,
                events = { "deathroll.updated" },
            })
        end,
    },
})
