local _, ns = ...

--- The deathroll games this addon knows (P15): those it plays or follows, then the games over, kept until the website
--- knows them and sent to it. A game: { id, challenger, challenged, stake, start, acceptedAt (Unix seconds), closesAt
--- (the game's clock, GetTime, when the guild's bets close), rolls = { { character, high, result } }, bets =
--- { [bettor] = { choice, amount } }, endedAt, paid = { by, at } }; its rules are Rules.lua's.
local Games = {}
ns.Games = Games

local DeathrollData, Rules = ns.DeathrollData, ns.Rules

local HEADER = "VXV-DEATHROLL-1"
local KIND = "deathroll"
local UPDATED = "deathroll.updated"
-- The games over kept, the latest: the website keeps them all.
local MAX_KEPT = 20

local saved = { games = {} }
local live = {}

--- Takes the module's saved data at start-up: the games over.
function Games.Restore(data)
    data.games = type(data.games) == "table" and data.games or {}
    saved = data
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
        if Rules.Turn(game) ~= nil then
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
    local roller, expected = Rules.Turn(game)
    if roller == nil or character ~= roller or high ~= expected or Rules.Betting(game) or type(result) ~= "number"
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
    if game == nil or not Rules.Betting(game) or bettor == game.challenger or bettor == game.challenged
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
    if game == nil or game.paid ~= nil or Rules.Winner(game) ~= by then
        return false
    end
    game.paid = { by = by, at = at }
    keep(game)
    changed()
    return true
end

--- The games over, by id.
function Games.Over()
    return saved.games
end
