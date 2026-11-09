local ns = select(2, ...).Deathroll

--- The deathroll's debts (P15.6): the stake the loser owes until the winner confirms the payment, as the website
--- knows them and as the games over since tell (VXV.DiceGames' ledger). From the website's limit on, a member's debts
--- (bets, deathrolls, Chi Fou Mi) bar them (owner's decision of 9 November: 100 po).
local Debts = {}
ns.Debts = Debts

local DeathrollData, Games, Rules = ns.DeathrollData, ns.Games, ns.Rules

local function ledger()
    return VXV.DiceGames.Ledger(DeathrollData.Current(), Games.Over(), Rules)
end

--- The unpaid games: { id, winner, loser, stake }.
function Debts.Unpaid()
    return ledger().Unpaid()
end

--- Whether the character's member owes too much to play or bet.
function Debts.Barred(name)
    return ledger().Barred(name)
end

--- The character's debts, paid or not, the latest first.
function Debts.History(name)
    return ledger().History(name)
end

--- The latest games over.
function Debts.Latest()
    return ledger().Latest()
end

-- The Journal (the Raid part) asks for the latest games: ("journal.games", add(label, games)).
VXV.On("journal.games", function(add)
    if type(add) == "function" then
        add("Deathroll", Debts.Latest())
    end
end)
