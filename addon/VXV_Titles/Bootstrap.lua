local _, ns = ...

VXV.RegisterModule({
    id = "titres",
    name = "Titres",
    Enable = function(data)
        ns.TitlesData.Restore(data)
        ns.Display.Start()
    end,
})
