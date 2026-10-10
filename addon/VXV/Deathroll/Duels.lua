local ns = select(2, ...).Deathroll

--- The deathroll between two members (P15.1 to P15.3), as the guild's addons tell it: the challenge whispered, the
--- answer, the start told to the guild (and to its chat), the guild's stakes for a minute, then each roll at its turn.
--- The roll is the game's own /roll, drawn by the server and seen in the chat; the roller's addon tells its result.
local Duels = {}
ns.Duels = Duels

local Debts, Games, Newcomers, Rules = ns.Debts, ns.Games, ns.Newcomers, ns.Rules

local CHALLENGE, ANSWER, START = "deathroll.challenge", "deathroll.answer", "deathroll.start"
local BET, ROLL, PAID = "deathroll.bet", "deathroll.roll", "deathroll.paid"
-- A challenge left unanswered this long is over.
local CHALLENGE_SECONDS = 60
local DEFAULT_START = 1000
Duels.DEFAULT_START = DEFAULT_START
local NEWCOMER = "Paris et deathroll sont réservés au rôle Membre sur Discord."

local challenges = {}
local sent = 0

local function wholeNumber(value)
    local number = tonumber(value)
    return number ~= nil and number >= 1 and number % 1 == 0 and number or nil
end

--- Challenges a member connected with VXV; returns why not, or nil when the challenge is sent.
function Duels.Challenge(target, stake, start)
    local me = VXV.PlayerName()
    stake, start = wholeNumber(stake), wholeNumber(start)
    if me == nil or target == nil or target == me then
        return "Choisis un membre à défier."
    end
    if stake == nil or start == nil or start < 2 then
        return "Mise d'au moins 1 po et nombre de départ d'au moins 2."
    end
    if Debts.Barred(me) then
        return "Tu as une dette (paris ou deathroll) : règle-la pour jouer de nouveau."
    end
    if Debts.Barred(target) then
        return target .. " a une dette : pas de deathroll avant qu'elle soit réglée."
    end
    if Newcomers.Is(me) then
        return NEWCOMER
    end
    if Newcomers.Is(target) then
        return target .. " n'a pas le rôle Membre sur Discord : pas de deathroll."
    end
    sent = sent + 1
    local id = table.concat({ me, time(), sent }, "#")
    challenges[id] = { target = target, stake = stake, start = start }
    VXV.Whisper(CHALLENGE, { id = id, stake = stake, start = start }, target)
    C_Timer.After(CHALLENGE_SECONDS, function()
        challenges[id] = nil
    end)
    return nil
end

VXV.OnMessage(CHALLENGE, function(payload, sender)
    if type(payload) ~= "table" or type(payload.id) ~= "string" or wholeNumber(payload.stake) == nil
        or (wholeNumber(payload.start) or 0) < 2 then
        return
    end
    local challenge = { id = payload.id, from = sender, stake = payload.stake, start = payload.start }
    if Debts.Barred(VXV.PlayerName()) then
        Duels.Answer(challenge, false)
        VXV.Print(sender .. " te défie au deathroll, mais ta dette t'en empêche : règle-la d'abord.")
        return
    end
    if Newcomers.Is(VXV.PlayerName()) then
        Duels.Answer(challenge, false)
        VXV.Print(sender .. " te défie au deathroll. " .. NEWCOMER)
        return
    end
    VXV.Emit("deathroll.challenged", challenge)
end)

--- The challenged answers the challenge.
function Duels.Answer(challenge, accepted)
    VXV.Whisper(ANSWER, { id = challenge.id, accepted = accepted == true }, challenge.from)
end

VXV.OnMessage(ANSWER, function(payload, sender)
    local challenge = type(payload) == "table" and challenges[payload.id]
    if not challenge or challenge.target ~= sender then
        return
    end
    challenges[payload.id] = nil
    if payload.accepted ~= true then
        VXV.Print(sender .. " refuse ton deathroll.")
        return
    end
    local me = VXV.PlayerName()
    VXV.Broadcast(START, { id = payload.id, a = me, b = sender, stake = challenge.stake, start = challenge.start,
        at = time() })
    VXV.SayToGuild(("Deathroll : %s contre %s pour %s, départ %d. Paris ouverts une minute dans l'addon.")
        :format(me, sender, VXV.Gold.Format(challenge.stake), challenge.start))
end)

VXV.OnMessage(START, function(payload, sender)
    if type(payload) ~= "table" or payload.a ~= sender or type(payload.id) ~= "string" or type(payload.b) ~= "string"
        or wholeNumber(payload.stake) == nil or (wholeNumber(payload.start) or 0) < 2
        or type(payload.at) ~= "number" or Games.Find(payload.id) ~= nil then
        return
    end
    Games.Start({ id = payload.id, challenger = payload.a, challenged = payload.b, stake = payload.stake,
        start = payload.start, acceptedAt = payload.at, closesAt = GetTime() + Rules.BETTING_SECONDS, rolls = {},
        bets = {} })
    VXV.Emit("deathroll.started", payload.id)
end)

--- Stakes on a player of the game during its minute of bets; returns why not, or nil.
function Duels.Bet(id, choice, amount)
    local game, me = Games.Find(id), VXV.PlayerName()
    if game == nil or not Rules.Betting(game) then
        return "Les paris de cette partie sont fermés."
    end
    if me == game.challenger or me == game.challenged then
        return "Les joueurs ne parient pas sur leur partie."
    end
    if Debts.Barred(me) then
        return "Tu as une dette (paris ou deathroll) : règle-la pour parier de nouveau."
    end
    if Newcomers.Is(me) then
        return NEWCOMER
    end
    if wholeNumber(amount) == nil then
        return "Mise d'au moins 1 po."
    end
    VXV.Broadcast(BET, { id = id, choice = choice, amount = wholeNumber(amount) })
    return nil
end

VXV.OnMessage(BET, function(payload, sender)
    if type(payload) == "table" and not Debts.Barred(sender) and not Newcomers.Is(sender) then
        Games.AddBet(payload.id, sender, payload.choice, payload.amount)
    end
end)

--- Rolls for the player whose turn it is: the game's own /roll, from 0 to the previous result.
function Duels.Roll(id)
    local game = Games.Find(id)
    if game == nil then
        return
    end
    local roller, high = Rules.Turn(game)
    if roller ~= VXV.PlayerName() or Rules.Betting(game) then
        return
    end
    VXV.Compat.RandomRoll(Rules.LOSING_ROLL, high)
end

-- The roller's own /roll, read in the chat: told to the guild for the game waiting for it.
VXV.On("roll", function(roll)
    local me = VXV.PlayerName()
    if roll.name ~= me or roll.low ~= Rules.LOSING_ROLL then
        return
    end
    for _, game in ipairs(Games.Live()) do
        local roller, high = Rules.Turn(game)
        if roller == me and high == roll.high and not Rules.Betting(game) then
            VXV.Broadcast(ROLL, { id = game.id, high = roll.high, result = roll.roll })
            return
        end
    end
end)

VXV.OnMessage(ROLL, function(payload, sender)
    if type(payload) == "table" and Games.AddRoll(payload.id, sender, payload.high, payload.result) then
        VXV.Emit("deathroll.rolled", payload.id)
    end
end)

--- The winner confirms the loser paid the stake (P15.6).
function Duels.ConfirmPaid(id)
    VXV.Broadcast(PAID, { id = id, at = time() })
end

VXV.OnMessage(PAID, function(payload, sender)
    if type(payload) == "table" and type(payload.at) == "number" then
        Games.Pay(payload.id, sender, payload.at)
    end
end)
