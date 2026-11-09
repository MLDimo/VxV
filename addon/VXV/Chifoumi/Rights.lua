local ns = select(2, ...).Chifoumi

--- Who may play or bet (P15.6, decisions of 10 October and 9 November): not a member owing the website's limit or more
--- (bets, deathrolls, Chi Fou Mi), as the website knows it and as the games over since tell (VXV.DiceGames' ledger),
--- nor a member without the role « Membre » on Discord. Without the website's data, nobody is barred.
local Rights = {}
ns.Rights = Rights

local ChifoumiData, Games, Rules = ns.ChifoumiData, ns.Games, ns.Rules

local function ledger()
    return VXV.DiceGames.Ledger(ChifoumiData.Current(), Games.Over(), Rules)
end

--- The unpaid games with a stake: { id, winner, loser, stake }.
function Rights.Unpaid()
    return ledger().Unpaid()
end

--- Whether the character's member owes too much to play or bet.
function Rights.InDebt(name)
    return ledger().Barred(name)
end

--- The character's debts, paid or not, the latest first.
function Rights.History(name)
    return ledger().History(name)
end

--- The latest games over.
function Rights.Latest()
    return ledger().Latest()
end

--- Whether the website says the character's member lacks the role « Membre ».
function Rights.Newcomer(name)
    return VXV.DiceGames.Newcomer(ChifoumiData.Current(), name)
end

-- The Journal (the Raid part) asks for the latest games: ("journal.games", add(label, games)).
VXV.On("journal.games", function(add)
    if type(add) == "function" then
        add("Chi Fou Mi", Rights.Latest())
    end
end)
