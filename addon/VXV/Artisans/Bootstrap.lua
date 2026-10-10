local ns = select(2, ...).Artisans

VXV.RegisterModule({
    id = "artisans",
    name = "Artisans",
    Enable = function(data)
        ns.ArtisansData.Restore(data)
        ns.Directory.Restore(data)
        ns.Professions.Start()
        ns.Sharing.Start()
        ns.RecipeItems.Start()
    end,
    tab = {
        place = "artisans",
        Build = ns.ArtisansTab.Build,
    },
})
