local ns = select(2, ...).Chifoumi

--- The Chi Fou Mi's rules (owner's request of 14 October): rock, paper, scissors at the best of three rounds, a draw
--- played again; the guild bets during the minute after the acceptance, before the first round
--- (packages/server/src/domain/chifoumis.ts).
local Rules = {}
ns.Rules = Rules

Rules.MOVES = { "pierre", "feuille", "ciseaux" }
Rules.MOVE_NAMES = { pierre = "Pierre", feuille = "Feuille", ciseaux = "Ciseaux" }
Rules.ROUNDS_TO_WIN = 2
Rules.BETTING_SECONDS = 60

-- What each move beats: the rock blunts the scissors, the paper wraps the rock, the scissors cut the paper.
local BEATS = { pierre = "ciseaux", feuille = "pierre", ciseaux = "feuille" }

function Rules.IsMove(move)
    return BEATS[move] ~= nil
end

--- Who won the round: "challenger", "challenged", or nil for a draw.
function Rules.RoundWinner(round)
    if round.challenger == round.challenged then
        return nil
    end
    return BEATS[round.challenger] == round.challenged and "challenger" or "challenged"
end

--- The rounds each player won: challenger's, challenged's.
function Rules.Score(game)
    local score = { challenger = 0, challenged = 0 }
    for _, round in ipairs(game.rounds) do
        local winner = Rules.RoundWinner(round)
        if winner ~= nil then
            score[winner] = score[winner] + 1
        end
    end
    return score.challenger, score.challenged
end

--- The game's loser once a player won two rounds; nil before.
function Rules.Loser(game)
    local challenger, challenged = Rules.Score(game)
    if challenger >= Rules.ROUNDS_TO_WIN then
        return game.challenged
    end
    return challenged >= Rules.ROUNDS_TO_WIN and game.challenger or nil
end

function Rules.Winner(game)
    local loser = Rules.Loser(game)
    return loser and (loser == game.challenger and game.challenged or game.challenger)
end

--- Whether the guild still bets on the game: before its first round, until the minute is over.
function Rules.Betting(game)
    return #game.rounds == 0 and GetTime() < game.closesAt
end
