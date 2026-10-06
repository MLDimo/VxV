local _, ns = ...

--- The deathroll games this addon knows (P15): those it plays or follows, then the games over, kept until the website
--- knows them. A game: { id, challenger, challenged, stake, start, acceptedAt (Unix seconds), closesAt (the game's
--- clock, GetTime, when the guild's bets close), rolls = { { character, high, result } }, bets = { [bettor] =
--- { choice, amount } }, endedAt, paid = { by, at } }. The challenged rolls first, each next roll from 1 to the
--- previous result; who rolls 1 loses the stake to the other.
local Games = {}
ns.Games = Games

local DeathrollData = ns.DeathrollData

local HEADER = "VXV-DEATHROLL-1"
local KIND = "deathroll"
local UPDATED = "deathroll.updated"
-- The guild bets during the minute after the acceptance, before the first roll (P15.2).
Games.BETTING_SECONDS = 60
-- The games over kept, the latest: the website keeps them all.
local MAX_KEPT = 20

local saved = { games = {} }
local live = {}

--- Takes the module's saved data at start-up: the games over.
function Games.Restore(data)
    data.games = type(data.games) == "table" and data.games or {}
    saved = data
end

--- The player whose turn it is and the high of their roll; nil once the game is over.
function Games.Turn(game)
    local last = game.rolls[#game.rolls]
    if last ~= nil and last.result == 1 then
        return nil
    end
    return #game.rolls % 2 == 0 and game.challenged or game.challenger, last and last.result or game.start
end

--- The player who rolled 1, once the game is over.
function Games.Loser(game)
    local last = game.rolls[#game.rolls]
    return last ~= nil and last.result == 1 and last.character or nil
end

function Games.Winner(game)
    local loser = Games.Loser(game)
    return loser and (loser == game.challenger and game.challenged or game.challenger)
end

--- Whether the guild still bets on the game: before its first roll, until the minute is over.
function Games.Betting(game)
    return #game.rolls == 0 and GetTime() < game.closesAt
end

--- The game as the website reads it (VXV-DEATHROLL-1, packages/server/src/domain/deathrolls.ts).
function Games.Text(game)
    local lines = { HEADER, table.concat({ "G", game.id, game.challenger, game.challenged, game.stake, game.start,
        game.acceptedAt, game.endedAt or 0 }, ";") }
    for _, roll in ipairs(game.rolls) do
        lines[#lines + 1] = table.concat({ "R", roll.character, roll.high, roll.result }, ";")
    end
    local bettors = {}
    for bettor in pairs(game.bets) do
        bettors[#bettors + 1] = bettor
    end
    table.sort(bettors)
    for _, bettor in ipairs(bettors) do
        lines[#lines + 1] = table.concat({ "B", bettor, game.bets[bettor].choice, game.bets[bettor].amount }, ";")
    end
    if game.paid ~= nil then
        lines[#lines + 1] = table.concat({ "Y", game.paid.by, game.paid.at }, ";")
    end
    return table.concat(lines, "\n")
end

local function changed()
    VXV.Emit(UPDATED)
end

--- Keeps a game over for the website: from its players' companion, or relayed by an officer's.
local function keep(game)
    saved.games[game.id] = game
    local over = {}
    for _, candidate in pairs(saved.games) do
        over[#over + 1] = candidate
    end
    table.sort(over, function(left, right)
        return left.endedAt > right.endedAt
    end)
    for index = MAX_KEPT + 1, #over do
        saved.games[over[index].id] = nil
        VXV.Emit("sync.put", KIND, over[index].id, nil)
    end
    local me = VXV.PlayerName()
    if me == game.challenger or me == game.challenged or DeathrollData.IsOfficer(me) then
        VXV.Emit("sync.put", KIND, game.id, Games.Text(game))
    end
end

--- A game of the guild starts, its bets open for a minute.
function Games.Start(game)
    live[game.id] = game
    changed()
end

function Games.Find(id)
    return live[id] or saved.games[id]
end

--- The games being played, the latest accepted first.
function Games.Live()
    local list = {}
    for _, game in pairs(live) do
        if Games.Turn(game) ~= nil then
            list[#list + 1] = game
        end
    end
    table.sort(list, function(left, right)
        return left.acceptedAt > right.acceptedAt
    end)
    return list
end

--- A roll told by the guild: kept when it is the one expected, from the player whose turn it is. True when kept.
function Games.AddRoll(id, character, high, result)
    local game = live[id]
    if game == nil then
        return false
    end
    local roller, expected = Games.Turn(game)
    if roller == nil or character ~= roller or high ~= expected or Games.Betting(game) or type(result) ~= "number"
        or result < 1 or result > high or result % 1 ~= 0 then
        return false
    end
    game.rolls[#game.rolls + 1] = { character = character, high = high, result = result }
    if result == 1 then
        game.endedAt = time()
        keep(game)
    end
    changed()
    return true
end

--- A stake of the guild on a player (P15.2): during the minute of bets, by someone else, of 1 po at least.
function Games.AddBet(id, bettor, choice, amount)
    local game = live[id]
    if game == nil or not Games.Betting(game) or bettor == game.challenger or bettor == game.challenged
        or (choice ~= game.challenger and choice ~= game.challenged) or type(amount) ~= "number" or amount < 1
        or amount % 1 ~= 0 then
        return false
    end
    game.bets[bettor] = { choice = choice, amount = amount }
    changed()
    return true
end

--- The winner confirms the payment (P15.6): the game goes to the website again with it.
function Games.Pay(id, by, at)
    local game = saved.games[id]
    if game == nil or game.paid ~= nil or Games.Winner(game) ~= by then
        return false
    end
    game.paid = { by = by, at = at }
    keep(game)
    changed()
    return true
end

--- The unpaid games: the website's, and those over since its data were exported (it cannot know them yet).
function Games.Unpaid()
    local list, known = {}, {}
    local data = DeathrollData.Current()
    for _, game in ipairs(data and data.unpaid or {}) do
        known[game.id] = true
        local stored = saved.games[game.id]
        if stored == nil or stored.paid == nil then
            list[#list + 1] = { id = game.id, winner = game.winner, loser = game.loser, stake = game.stake }
        end
    end
    local exportedAt = DeathrollData.ExportedAt()
    for _, game in pairs(saved.games) do
        if not known[game.id] and game.paid == nil and game.endedAt > exportedAt then
            list[#list + 1] = { id = game.id, winner = Games.Winner(game), loser = Games.Loser(game),
                stake = game.stake }
        end
    end
    return list
end

--- Whether the character's member is in debt (bets or deathrolls): barred from deathrolls (P15.6).
function Games.Barred(name)
    local data, memberId = DeathrollData.Current(), DeathrollData.MemberOf(name)
    if data ~= nil and memberId ~= nil and data.barred[memberId] then
        return true
    end
    for _, game in ipairs(Games.Unpaid()) do
        if game.loser == name then
            return true
        end
    end
    return false
end
