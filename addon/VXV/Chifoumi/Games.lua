local ns = select(2, ...).Chifoumi

--- The Chi Fou Mi this addon knows: those it plays or follows, then the games over, kept until the website knows them
--- and sent to it. A game: { id, challenger, challenged, stake, acceptedAt (Unix seconds), closesAt (the game's clock,
--- GetTime, when the guild's bets close), rounds = { { challenger = move, challenged = move } }, locked = { [player]
--- = true } and moves = { [player] = move } for the round being played, bets = { [bettor] = { choice, amount } },
--- endedAt, paid = { by, at } }; its rules are Rules.lua's.
local Games = {}
ns.Games = Games

local ChifoumiData, Rules = ns.ChifoumiData, ns.Rules

local HEADER = "VXV-CHIFOUMI-1"
local KIND = "chifoumi"
local UPDATED = "chifoumi.updated"
-- The games over kept, the latest: the website keeps them all.
local MAX_KEPT = 20

local saved = { games = {} }
local live = {}

--- Takes the module's saved data at start-up: the games over.
function Games.Restore(data)
    data.games = type(data.games) == "table" and data.games or {}
    saved = data
end

--- The game as the website reads it (VXV-CHIFOUMI-1, packages/server/src/domain/chifoumis.ts).
function Games.Text(game)
    local lines = { HEADER, table.concat({ "G", game.id, game.challenger, game.challenged, game.stake, game.acceptedAt,
        game.endedAt or 0 }, ";") }
    for _, round in ipairs(game.rounds) do
        lines[#lines + 1] = table.concat({ "M", round.challenger, round.challenged }, ";")
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
    game.locked, game.moves = nil, nil
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
    if me == game.challenger or me == game.challenged or ChifoumiData.IsOfficer(me) then
        VXV.Emit("sync.put", KIND, game.id, Games.Text(game))
    end
end

--- A game of the guild starts, its bets open for a minute.
function Games.Start(game)
    game.locked, game.moves = {}, {}
    live[game.id] = game
    changed()
end

function Games.Find(id)
    return live[id] or saved.games[id]
end

--- Whether the game is being played: started, not won yet.
function Games.IsLive(game)
    return game ~= nil and live[game.id] == game and Rules.Loser(game) == nil
end

--- The games being played, the latest accepted first.
function Games.Live()
    local list = {}
    for _, game in pairs(live) do
        if Games.IsLive(game) then
            list[#list + 1] = game
        end
    end
    table.sort(list, function(left, right)
        return left.acceptedAt > right.acceptedAt
    end)
    return list
end

--- Whether the round being played is open to this player's move: the bets closed, the game going on, the player one
--- of its two, not locked yet.
function Games.Awaits(game, player)
    return Games.IsLive(game) and not Rules.Betting(game) and (player == game.challenger or player == game.challenged)
        and not game.locked[player]
end

--- A player locked their move for the round (without telling it). True when kept.
function Games.Lock(id, player, round)
    local game = live[id]
    if not Games.Awaits(game, player) or round ~= #game.rounds + 1 then
        return false
    end
    game.locked[player] = true
    changed()
    return true
end

--- Whether both players locked their move for the round being played.
function Games.BothLocked(game)
    return game.locked[game.challenger] == true and game.locked[game.challenged] == true
end

--- A player tells their move once both locked: the round ends with both moves, and the game with two rounds won.
--- True when kept.
function Games.Reveal(id, player, round, move)
    local game = live[id]
    if game == nil or not Games.BothLocked(game) or round ~= #game.rounds + 1 or not Rules.IsMove(move)
        or game.moves[player] ~= nil or (player ~= game.challenger and player ~= game.challenged) then
        return false
    end
    game.moves[player] = move
    if game.moves[game.challenger] ~= nil and game.moves[game.challenged] ~= nil then
        game.rounds[#game.rounds + 1] = { challenger = game.moves[game.challenger],
            challenged = game.moves[game.challenged] }
        game.locked, game.moves = {}, {}
        if Rules.Loser(game) ~= nil then
            game.endedAt = time()
            keep(game)
        end
    end
    changed()
    return true
end

--- A stake of the guild on a player: during the minute of bets, by someone else, of 1 po at least.
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

--- The winner confirms the payment: the game goes to the website again with it.
function Games.Pay(id, by, at)
    local game = saved.games[id]
    if game == nil or game.paid ~= nil or game.stake == 0 or Rules.Winner(game) ~= by then
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
