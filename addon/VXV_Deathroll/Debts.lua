local _, ns = ...

--- The deathroll's debts (P15.6): the stake the loser owes until the winner confirms the payment, as the website
--- knows them and as the games over since its data were exported tell; a debt, bets or deathroll, bars the member.
local Debts = {}
ns.Debts = Debts

local DeathrollData, Games, Rules = ns.DeathrollData, ns.Games, ns.Rules

--- The unpaid games: the website's, and those over since its data were exported (it cannot know them yet).
function Debts.Unpaid()
    local list, known = {}, {}
    local data = DeathrollData.Current()
    for _, game in ipairs(data and data.unpaid or {}) do
        known[game.id] = true
        local stored = Games.Over()[game.id]
        if stored == nil or stored.paid == nil then
            list[#list + 1] = { id = game.id, winner = game.winner, loser = game.loser, stake = game.stake }
        end
    end
    local exportedAt = DeathrollData.ExportedAt()
    for _, game in pairs(Games.Over()) do
        if not known[game.id] and game.paid == nil and game.endedAt > exportedAt then
            list[#list + 1] = { id = game.id, winner = Rules.Winner(game), loser = Rules.Loser(game),
                stake = game.stake }
        end
    end
    return list
end

--- Whether the character's member is in debt (bets or deathrolls): barred from deathrolls (P15.6).
function Debts.Barred(name)
    local data = DeathrollData.Current()
    local memberId = name ~= nil and VXV.MemberOf(data, name) or nil
    if data ~= nil and memberId ~= nil and data.barred[memberId] then
        return true
    end
    for _, game in ipairs(Debts.Unpaid()) do
        if game.loser == name then
            return true
        end
    end
    return false
end
