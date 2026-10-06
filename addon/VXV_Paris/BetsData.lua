local _, ns = ...

local function seconds(value)
    local number = tonumber(value)
    return number ~= nil and number > 0 and number or nil
end

--- The bets as the website exports them (contract VXV-PARIS-1, packages/server/src/domain/addonBets.ts), brought
--- by the player's companion or passed on by an officer's addon (the core's site data), with the answers to the
--- stakes made in game.
ns.BetsData = VXV.SiteData({
    name = "paris",
    header = "VXV-PARIS-1",
    New = function()
        return { bets = {}, byId = {}, ranking = {}, results = {},
            cash = { balance = 0, entries = 0, exits = 0, movements = {} } }
    end,
    lines = {
        B = { 5, function(data, f)
            local bet = { id = f[1], closesAt = tonumber(f[2]), endedAt = seconds(f[3]), title = f[5], choices = {},
                stakes = {} }
            bet.winner = f[4] ~= "" and f[4] or nil
            data.bets[#data.bets + 1] = bet
            data.byId[bet.id] = bet
            return bet.closesAt ~= nil
        end },
        H = { 3, function(data, f)
            local bet = data.byId[f[1]]
            if bet == nil then
                return false
            end
            bet.choices[#bet.choices + 1] = { id = f[2], label = f[3] }
            return true
        end },
        S = { 8, function(data, f)
            local bet = data.byId[f[1]]
            local amount, gain = tonumber(f[6]), tonumber(f[8])
            if bet == nil or amount == nil or gain == nil then
                return false
            end
            bet.stakes[#bet.stakes + 1] = { memberId = f[2], name = f[3], class = f[4] ~= "" and f[4] or nil,
                choiceId = f[5], amount = amount, standing = f[7], gain = gain }
            return true
        end },
        T = { 3, function(data, f)
            data.cash.balance, data.cash.entries, data.cash.exits = tonumber(f[1]), tonumber(f[2]), tonumber(f[3])
            return data.cash.balance ~= nil and data.cash.entries ~= nil and data.cash.exits ~= nil
        end },
        K = { 3, function(data, f)
            local at, amount = tonumber(f[1]), tonumber(f[2])
            data.cash.movements[#data.cash.movements + 1] = { at = at, amount = amount, label = f[3] }
            return at ~= nil and amount ~= nil
        end },
        R = { 5, function(data, f)
            local rank, net, bets = tonumber(f[1]), tonumber(f[4]), tonumber(f[5])
            data.ranking[#data.ranking + 1] = { rank = rank, name = f[2], class = f[3] ~= "" and f[3] or nil,
                net = net, bets = bets }
            return rank ~= nil and net ~= nil and bets ~= nil
        end },
        C = { 3, function(data, f)
            data.results[f[1]] = { accepted = f[2] == "1", message = f[3] }
            return true
        end },
    },
})
