local ns = select(2, ...).Missions

VXV.RegisterModule({
    id = "quetes",
    name = "Quêtes",
    Enable = function(data)
        ns.QuestsData.Restore(data)
        ns.Changes.Restore(data)
        ns.Gathering.Restore(data)
        ns.Readings.Restore(data)
        ns.Readings.Start()
    end,
    tab = {
        place = "quests",
        Build = ns.QuestsTab.Build,
        Card = function()
            return ns.QuestsView.Card(ns.QuestsData.Current(), time())
        end,
        Compact = ns.QuestsCompact.Build,
    },
})

-- The Taverne's card follows the missions and the live scores.
VXV.On("quetes.updated", function()
    VXV.Emit("tavern.changed")
end)
VXV.On("quetes.live", function()
    VXV.Emit("tavern.changed")
end)
