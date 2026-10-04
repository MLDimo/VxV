local _, ns = ...

VXV.RegisterModule({
    id = "raid",
    name = "Raid",
    Enable = function(data)
        ns.RaidData.Restore(data)
        ns.RaidLog.Restore(data)
        ns.Sharing.Start()
        ns.Freshness.Start()
    end,
    tab = { title = "Raid", Build = ns.RaidTab.Build },
})

VXV.RegisterModule({
    id = "loot",
    name = "Butin",
    tab = { title = "Butin", Build = ns.LootTab.Build },
})
