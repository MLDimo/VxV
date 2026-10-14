local ns = select(2, ...).Chifoumi

VXV.RegisterModule({
    id = "chifoumi",
    name = "Chi Fou Mi",
    Enable = function(data)
        ns.ChifoumiData.Restore(data)
        ns.Games.Restore(data)
    end,
    tab = {
        place = "dice",
        name = "Chi Fou Mi",
        order = 3,
        Build = ns.ChifoumiTab.Build,
    },
})
