local _, ns = ...

VXV.RegisterModule({
    id = "raid",
    name = "Raid",
    Enable = ns.RaidData.Restore,
    tab = { title = "Raid", Build = ns.RaidTab.Build },
})
