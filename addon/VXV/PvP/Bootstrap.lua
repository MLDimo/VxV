local ns = select(2, ...).PvP

-- The PvP place: its events, then the duels and their Elo, each in its tab.
VXV.RegisterModule({
    id = "pvp",
    name = "PvP",
    Enable = function(data)
        ns.PvpData.Restore(data)
        ns.Changes.Restore(data)
    end,
    tab = { place = "pvp", name = "Événements", order = 1, Build = ns.EventsTab.Build },
})

VXV.RegisterModule({
    id = "duels",
    name = "Duels",
    tab = { place = "pvp", name = "Duels", order = 2, Build = ns.DuelsTab.Build },
})
