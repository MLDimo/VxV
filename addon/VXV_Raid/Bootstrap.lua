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
    tab = {
        place = "raid",
        Build = ns.RaidTab.Build,
        Card = function()
            return ns.RaidView.Card(ns.RaidData.Current())
        end,
    },
})

-- The Taverne's card follows the event's data.
VXV.On("raid.updated", function()
    VXV.Emit("tavern.changed")
end)

VXV.RegisterModule({
    id = "journal",
    name = "Journal",
    tab = { place = "journal", Build = ns.JournalTab.Build },
})
