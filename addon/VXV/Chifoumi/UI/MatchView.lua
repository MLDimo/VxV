local ns = select(2, ...).Chifoumi

--- What the game's window shows (the mockup AddonChifoumi): the two sides, the arena's two slots and what stands
--- between them, the round's label, the status, the rounds so far. Each round ends with its reveal: « Chi… Fou… Mi ! »
--- over the sealed moves, then both moves and who won, a moment before the next round. Built from data alone.
local MatchView = {}
ns.MatchView = MatchView

local Rules = ns.Rules

local Gold = VXV.Gold

local NAMES = Rules.MOVE_NAMES
local VERBS = { pierre = "casse", feuille = "enveloppe", ciseaux = "coupent" }
MatchView.HINTS = { pierre = "bat Ciseaux", feuille = "bat Pierre", ciseaux = "battent Feuille" }
local COUNTDOWN = { "Chi…", "Fou…", "Mi !" }
-- Seconds of each word of the countdown, then of the moves shown before the next round.
local BEAT_SECONDS, HOLD_SECONDS = 0.5, 2.5
MatchView.REVEAL_SECONDS = #COUNTDOWN * BEAT_SECONDS + HOLD_SECONDS

--- The window's sides: the player on the left when they play, else the challenged.
function MatchView.Sides(game, me)
    if me == game.challenger then
        return game.challenger, game.challenged
    end
    return game.challenged, game.challenger
end

--- Under a player's name: who challenged, and « toi ».
function MatchView.Role(game, name, me)
    return (name == game.challenger and "Lance le défi" or "Défié") .. (name == me and " · toi" or "")
end

--- The rounds the player won.
function MatchView.RoundsWon(game, name)
    local challenger, challenged = Rules.Score(game)
    return name == game.challenger and challenger or challenged
end

--- Where the window stands: "betting", "countdown" (with the word), "reveal", "choose" or "done".
function MatchView.Phase(game, now)
    local since = game.roundAt and now - game.roundAt
    if since ~= nil and since < #COUNTDOWN * BEAT_SECONDS then
        return "countdown", COUNTDOWN[math.floor(since / BEAT_SECONDS) + 1]
    end
    if Rules.Loser(game) ~= nil then
        return "done"
    end
    if since ~= nil and since < MatchView.REVEAL_SECONDS then
        return "reveal"
    end
    return Rules.Betting(game) and "betting" or "choose"
end

--- The round's outcome: "Pierre casse Ciseaux" and its winner, or "Égalité · Pierre" and nil.
function MatchView.Outcome(game, round)
    local winner = Rules.RoundWinner(round)
    if winner == nil then
        return "Égalité · " .. NAMES[round.challenger], nil
    end
    local loser = winner == "challenger" and "challenged" or "challenger"
    return NAMES[round[winner]] .. " " .. VERBS[round[winner]] .. " " .. NAMES[round[loser]], game[winner]
end

--- A slot of the arena for the side's player: { move (shown), sealed, label, won, lost }. myMove: the player's own
--- move for the round, which only they see before the reveal.
function MatchView.Slot(game, name, me, phase, myMove)
    local side = name == game.challenger and "challenger" or "challenged"
    local last = game.rounds[#game.rounds]
    if phase == "countdown" then
        return { sealed = true, label = name .. " · coup scellé" }
    end
    if (phase == "reveal" or phase == "done") and last ~= nil then
        local _, winner = MatchView.Outcome(game, last)
        return { move = last[side], label = name .. " · " .. NAMES[last[side]], won = winner == name,
            lost = winner ~= nil and winner ~= name }
    end
    if name == me and myMove ~= nil then
        return { move = myMove, label = "Ton coup · " .. NAMES[myMove] }
    end
    if game.locked[name] then
        return { sealed = true, label = name .. " · coup scellé" }
    end
    if phase == "betting" then
        return { label = name }
    end
    return { label = name == me and "Choisis ton coup" or (name .. " réfléchit…") }
end

--- Between the slots: « VS », the countdown's word, or how the last round went for the left side (>, <, =).
function MatchView.Versus(game, left, phase, word)
    if phase == "countdown" then
        return word, word == COUNTDOWN[#COUNTDOWN] and "gold" or "ivory"
    end
    local last = game.rounds[#game.rounds]
    if (phase == "reveal" or phase == "done") and last ~= nil then
        local _, winner = MatchView.Outcome(game, last)
        return winner == nil and "=" or (winner == left and ">" or "<"), winner == nil and "muted" or "gold"
    end
    return "VS", "sakura"
end

--- Above the arena: « Manche 2 · score 1 – 0 », the left side's rounds first, or « Partie terminée ».
function MatchView.RoundLabel(game, left, right, phase)
    if phase == "done" then
        return "Partie terminée"
    end
    local played = (phase == "countdown" or phase == "reveal") and #game.rounds or #game.rounds + 1
    return ("Manche %d · score %d – %d"):format(played, MatchView.RoundsWon(game, left),
        MatchView.RoundsWon(game, right))
end

--- Under the arena: the minute of bets, what the player does, the round's outcome, or the game's.
function MatchView.Status(game, me, phase, now)
    local winner = Rules.Winner(game)
    if phase == "done" then
        local loser = Rules.Loser(game)
        return ("%s remporte la partie %d – %d%s."):format(winner, MatchView.RoundsWon(game, winner),
            MatchView.RoundsWon(game, loser), game.stake > 0 and (" et empoche " .. Gold.Format(game.stake)) or "")
    end
    if phase == "countdown" then
        return "Coups scellés… révélation au « Mi ! »"
    end
    if phase == "reveal" then
        local outcome, roundWinner = MatchView.Outcome(game, game.rounds[#game.rounds])
        return roundWinner and (outcome .. " · manche pour " .. roundWinner) or "Égalité : la manche est rejouée."
    end
    if phase == "betting" then
        return ("Paris ouverts encore %d s, puis la première manche."):format(math.ceil(game.closesAt - now))
    end
    local other = me == game.challenger and game.challenged or game.challenger
    if me == game.challenger or me == game.challenged then
        if game.locked[me] then
            return "Coup scellé : en attente de " .. other .. "."
        end
        return "Choisis Pierre, Feuille ou Ciseaux" .. (game.locked[other] and (" : " .. other ..
            " a déjà scellé son coup.") or ".")
    end
    return "Les deux joueurs choisissent leur coup."
end

--- The rounds so far, the latest last: « M2 · Pierre casse Ciseaux · Thom Leboss ».
function MatchView.History(game)
    local parts = {}
    for index, round in ipairs(game.rounds) do
        local outcome, winner = MatchView.Outcome(game, round)
        parts[#parts + 1] = ("M%d · %s · %s"):format(index, outcome, winner or "on rejoue")
    end
    return table.concat(parts, "   ")
end

--- The guild's stakes on each player: « Paris : 300 po sur Vorn Cendrelune · 100 po sur Thom Leboss ».
function MatchView.Bets(game, left, right)
    local totals = { [game.challenger] = 0, [game.challenged] = 0 }
    for _, bet in pairs(game.bets) do
        totals[bet.choice] = totals[bet.choice] + bet.amount
    end
    return ("Paris des spectateurs : %s sur %s · %s sur %s"):format(Gold.Format(totals[left]), left,
        Gold.Format(totals[right]), right)
end
