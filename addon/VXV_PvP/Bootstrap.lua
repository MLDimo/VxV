local _, ns = ...

VXV.RegisterModule({
    id = "pvp",
    name = "PvP",
    Enable = function(data)
        ns.PvpData.Restore(data)
        ns.Changes.Restore(data)
    end,
    tab = { place = "pvp", Build = ns.PvpTab.Build },
})
