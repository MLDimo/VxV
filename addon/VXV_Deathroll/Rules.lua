local _, ns = ...

--- The deathroll's rules (P15): the challenged rolls first, each next roll from 0 to the previous result, and who
--- rolls 0 loses the stake to the other; the guild bets during the minute before the first roll.
local Rules = {}
ns.Rules = Rules

-- Every roll starts there, and who rolls it loses (owner's rule of 8 October).
Rules.LOSING_ROLL = 0

-- The guild bets during the minute after the acceptance, before the first roll (P15.2).
Rules.BETTING_SECONDS = 60

--- The player whose turn it is and the high of their roll; nil once the game is over.
function Rules.Turn(game)
    local last = game.rolls[#game.rolls]
    if last ~= nil and last.result == Rules.LOSING_ROLL then
        return nil
    end
    return #game.rolls % 2 == 0 and game.challenged or game.challenger, last and last.result or game.start
end

--- The player who rolled the losing roll, once the game is over.
function Rules.Loser(game)
    local last = game.rolls[#game.rolls]
    return last ~= nil and last.result == Rules.LOSING_ROLL and last.character or nil
end

function Rules.Winner(game)
    local loser = Rules.Loser(game)
    return loser and (loser == game.challenger and game.challenged or game.challenger)
end

--- Whether the guild still bets on the game: before its first roll, until the minute is over.
function Rules.Betting(game)
    return #game.rolls == 0 and GetTime() < game.closesAt
end
