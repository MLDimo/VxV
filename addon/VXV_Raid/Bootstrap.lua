local _, ns = ...

VXV.RegisterModule({
    id = "raid",
    name = "Raid",
    Enable = function(data)
        ns.RaidData.Restore(data)
        ns.Sharing.Start()
        ns.Freshness.Start()
    end,
    tab = { title = "Raid", Build = ns.RaidTab.Build },
})
