local ns = select(2, ...).Deathroll

--- What the duel's window says (P15.4, mockup AddonDeathroll): the heat of the game, from violet to red as the high
--- comes near 0, the turn, the rolls so far, each player's role and result, and the guild's stakes. While a roll's
--- digits scroll, the window shows the game as it stood before that roll: its result comes when they stop.
local DuelView = {}
ns.DuelView = DuelView

local Rules = ns.Rules

local Gold, Theme = VXV.Gold, VXV.Theme

local COLD, HOT = "deathroll-cold", "deathroll-hot"

--- The game as it stood before its last roll: what the window shows while that roll's digits scroll.
function DuelView.Before(game)
    local before = {}
    for key, value in pairs(game) do
        before[key] = value
    end
    before.rolls = {}
    for index = 1, #game.rolls - 1 do
        before.rolls[index] = game.rolls[index]
    end
    return before
end

--- Between 0 (the start) and 1 (a high of 1), on a log scale: each halving of the high brings as much red.
function DuelView.Heat(game)
    local _, high = Rules.Turn(game)
    if high == nil or game.start <= 1 then
        return 1
    end
    return 1 - math.log(math.max(1, high)) / math.log(game.start)
end

--- The window's background for the heat: red, green and blue between 0 and 1.
function DuelView.Color(heat)
    local r1, g1, b1 = Theme.Color(COLD)
    local r2, g2, b2 = Theme.Color(HOT)
    return r1 + (r2 - r1) * heat, g1 + (g2 - g1) * heat, b1 + (b2 - b1) * heat
end

--- The big number: the last result, or the starting number.
function DuelView.Number(game)
    local last = game.rolls[#game.rolls]
    return last and last.result or game.start
end

--- Under the number: the seconds of bets, whose turn it is, the roll being drawn, or how the game ended.
function DuelView.Status(game, rolling)
    local roller, high = Rules.Turn(game)
    if rolling then
        return ("%s roll de %d à %d…"):format(roller, Rules.LOSING_ROLL, high)
    end
    if roller == nil then
        return ("%s a fait %d : %s gagne %s."):format(Rules.Loser(game), Rules.LOSING_ROLL, Rules.Winner(game),
            Gold.Format(game.stake))
    end
    if Rules.Betting(game) then
        return ("Paris ouverts encore %d s, puis %s roll de %d à %d."):format(math.ceil(game.closesAt - GetTime()),
            roller, Rules.LOSING_ROLL, high)
    end
    return ("À %s : roll de %d à %d."):format(roller, Rules.LOSING_ROLL, high)
end

--- The rolls so far: "1000 → 412 → 87 → 1".
function DuelView.History(game)
    local parts = { tostring(game.start) }
    for _, roll in ipairs(game.rolls) do
        parts[#parts + 1] = tostring(roll.result)
    end
    return table.concat(parts, " → ")
end

--- Under a player's name: who challenged, who rolls first, and « toi ».
function DuelView.Role(game, name, me)
    return (name == game.challenger and "Lance le défi" or "Défié · roll en premier") .. (name == me and " · toi" or "")
end

--- The guild's stakes on each player: { [player] = total }, and the pot.
local function totals(game)
    local byPlayer, pot = { [game.challenger] = 0, [game.challenged] = 0 }, 0
    for _, bet in pairs(game.bets) do
        byPlayer[bet.choice] = byPlayer[bet.choice] + bet.amount
        pot = pot + bet.amount
    end
    return byPlayer, pot
end

--- The guild's stakes on each player: "Paris : 300 po sur Thom Leboss · 100 po sur Vorn Cendrelune".
function DuelView.Bets(game)
    local byPlayer = totals(game)
    return ("Paris : %s sur %s · %s sur %s"):format(Gold.Format(byPlayer[game.challenger]), game.challenger,
        Gold.Format(byPlayer[game.challenged]), game.challenged)
end

--- The bar at the bottom: the bets open or closed, and the pot.
function DuelView.Pot(game)
    local _, pot = totals(game)
    return ("Paris des spectateurs %s · cagnotte %s"):format(Rules.Betting(game) and "ouverts" or "fermés",
        Gold.Format(pot))
end
