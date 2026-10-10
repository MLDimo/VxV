local ns = select(2, ...).Titles

VXV.RegisterModule({
    id = "titres",
    name = "Titres",
    Enable = function(data)
        ns.TitlesData.Restore(data)
        ns.Display.Start()
    end,
})
