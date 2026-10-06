local _, ns = ...

VXV.RegisterModule({
    id = "artisans",
    name = "Artisans",
    Enable = function(data)
        ns.Directory.Restore(data)
        ns.Professions.Start()
        ns.Sharing.Start()
    end,
    tab = {
        place = "artisans",
        Build = ns.ArtisansTab.Build,
    },
})
