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
        ns.Stakes.Restore(data)
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

-- The bettors' ranking, as the Ranking's first tab (§7.5).
VXV.RegisterModule({
    id = "paris-classement",
    name = "Classement des parieurs",
    tab = {
        place = "ranking",
        name = "Paris",
        order = 1,
        Build = function(frame)
            VXV.Screen.List(frame, {
                place = "ranking",
                heading = "Classement des parieurs",
                subtitle = function()
                    return "Gain net de chacun sur les paris terminés, depuis toujours."
                end,
                rows = function()
                    return ns.DiceView.Ranking(ns.BetsData.Current())
                end,
                events = { "paris.updated" },
            })
        end,
    },
})

-- The Taverne's card and the cash follow the bets' data.
VXV.On("paris.updated", function(data)
    VXV.Emit("tavern.changed")
    tellCash(data)
end)
