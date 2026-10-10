local ns = select(2, ...).Deathroll

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
