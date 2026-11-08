local ns = select(2, ...).Fishing

VXV.RegisterModule({
    id = "fishing",
    name = "Pêche",
    Enable = function(data)
        ns.Gear.Load(data)
        ns.Key.Load(data)
        ns.Session.Load(data)
    end,
    tab = {
        place = "artisans",
        name = "Pêche",
        order = 2,
        Build = ns.FishingTab.Build,
        Compact = ns.FishingTab.Compact,
    },
})

VXV.RegisterCommand("peche", "lancer ou quitter une session de pêche (pêcheurs)", ns.Session.Toggle)
