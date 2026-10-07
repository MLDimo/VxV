local _, ns = ...

--- The guild's cash goes to whoever shows it (the Journal's left page, VXV_Raid) through the core's bus, as lines.
local function tellCash(data)
    VXV.Emit("cash.updated", ns.DiceView.CashLines(data))
end

VXV.RegisterModule({
    id = "paris",
    name = "Le Dé Pipé",
    Enable = function(data)
        ns.BetsData.Restore(data)
        ns.Changes.Restore(data)
        tellCash(ns.BetsData.Current())
    end,
    tab = {
        place = "dice",
        name = "Paris",
        order = 1,
        Build = ns.DiceTab.Build,
        Card = function()
            return ns.DiceView.Card(ns.BetsData.Current(), time())
        end,
        Compact = ns.DiceCompact.Build,
    },
})

-- The Taverne's card and the cash follow the bets' data.
VXV.On("paris.updated", function(data)
    VXV.Emit("tavern.changed")
    tellCash(data)
end)
