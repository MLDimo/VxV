local ns = select(2, ...).Chifoumi

--- What the game's window says: the score, the minute of bets or the round being played, the rounds so far and the
--- guild's stakes.
local MatchView = {}
ns.MatchView = MatchView

local Games, Rules = ns.Games, ns.Rules

local Gold = VXV.Gold

local NAMES = Rules.MOVE_NAMES

--- "1 – 0": the challenged's rounds, then the challenger's (the challenged on the left).
function MatchView.Score(game)
    local challenger, challenged = Rules.Score(game)
    return ("%d – %d"):format(challenged, challenger)
end

--- Under the score: the minute of bets, the round being played, or how the game ended.
function MatchView.Status(game, me)
    local winner = Rules.Winner(game)
    if winner ~= nil then
        return ("%s gagne %s."):format(winner, Gold.Format(game.stake))
    end
    if Rules.Betting(game) then
        return ("Paris ouverts encore %d s, puis la première manche."):format(math.ceil(game.closesAt - GetTime()))
    end
    local round = ("Manche %d"):format(#game.rounds + 1)
    if me == game.challenger or me == game.challenged then
        return game.locked[me] and (round .. " : coup joué, en attente de l'autre joueur.")
            or (round .. " : choisis ton coup.")
    end
    local waiting = {}
    for _, player in ipairs({ game.challenged, game.challenger }) do
        if not game.locked[player] then
            waiting[#waiting + 1] = player
        end
    end
    return #waiting == 0 and (round .. " : coups joués.") or (round .. " : en attente de " ..
        table.concat(waiting, " et ") .. ".")
end

--- The rounds so far: "Pierre / Ciseaux · Feuille / Feuille", the challenged's move first.
function MatchView.History(game)
    local parts = {}
    for _, round in ipairs(game.rounds) do
        parts[#parts + 1] = NAMES[round.challenged] .. " / " .. NAMES[round.challenger]
    end
    return #parts == 0 and "Aucune manche jouée." or table.concat(parts, " · ")
end

--- The guild's stakes on each player: "Paris : 300 po sur Vorn Cendrelune · 100 po sur Thom Leboss".
function MatchView.Bets(game)
    local totals = { [game.challenger] = 0, [game.challenged] = 0 }
    for _, bet in pairs(game.bets) do
        totals[bet.choice] = totals[bet.choice] + bet.amount
    end
    return ("Paris : %s sur %s · %s sur %s"):format(Gold.Format(totals[game.challenged]), game.challenged,
        Gold.Format(totals[game.challenger]), game.challenger)
end

--- Whether the player has a move to play in the game now.
function MatchView.CanPlay(game, me)
    return Games.Awaits(game, me)
end
