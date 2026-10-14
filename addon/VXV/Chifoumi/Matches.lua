local ns = select(2, ...).Chifoumi

--- The Chi Fou Mi between two members, as the guild's addons tell it: the challenge whispered, the answer, the start
--- told to the guild (one line in its chat, no window for the others), the guild's stakes for a minute, then each
--- round. A move is locked first, unknown to the others; once both players locked theirs, each addon tells its own.
local Matches = {}
ns.Matches = Matches

local Games, Rights, Rules = ns.Games, ns.Rights, ns.Rules

local CHALLENGE, ANSWER, START = "chifoumi.challenge", "chifoumi.answer", "chifoumi.start"
local BET, LOCK, REVEAL, PAID = "chifoumi.bet", "chifoumi.lock", "chifoumi.reveal", "chifoumi.paid"
-- A challenge left unanswered this long is over.
local CHALLENGE_SECONDS = 60
local IN_DEBT = "Tu as une dette (paris, deathroll ou Chi Fou Mi) : règle-la pour jouer de nouveau."
local NEWCOMER = "Paris, deathroll et Chi Fou Mi sont réservés au rôle Membre sur Discord."

local challenges = {}
local sent = 0
-- The player's own move for each game: { round, move }, told once both players locked theirs.
local mine = {}

--- A whole number of gold pieces, 0 included.
local function stakeOf(value)
    local number = tonumber(value)
    return number ~= nil and number >= 0 and number % 1 == 0 and number or nil
end

--- Why this player may not play or bet, or nil.
local function refusal(name, self)
    if Rights.InDebt(name) then
        return self and IN_DEBT or (name .. " a une dette : pas de Chi Fou Mi avant qu'elle soit réglée.")
    end
    if Rights.Newcomer(name) then
        return self and NEWCOMER or (name .. " n'a pas le rôle Membre sur Discord : pas de Chi Fou Mi.")
    end
    return nil
end

--- Challenges a member connected with VXV for a stake, 0 included; returns why not, or nil when the challenge is
--- sent.
function Matches.Challenge(target, stake)
    local me = VXV.PlayerName()
    stake = stakeOf(stake)
    if me == nil or target == nil or target == me then
        return "Choisis un membre à défier."
    end
    if stake == nil then
        return "Mise en pièces d'or entières, 0 compris."
    end
    local why = refusal(me, true) or refusal(target, false)
    if why ~= nil then
        return why
    end
    sent = sent + 1
    local id = table.concat({ me, time(), sent }, "#")
    challenges[id] = { target = target, stake = stake }
    VXV.Whisper(CHALLENGE, { id = id, stake = stake }, target)
    C_Timer.After(CHALLENGE_SECONDS, function()
        challenges[id] = nil
    end)
    return nil
end

--- The challenged answers the challenge.
function Matches.Answer(challenge, accepted)
    VXV.Whisper(ANSWER, { id = challenge.id, accepted = accepted == true }, challenge.from)
end

VXV.OnMessage(CHALLENGE, function(payload, sender)
    if type(payload) ~= "table" or type(payload.id) ~= "string" or stakeOf(payload.stake) == nil then
        return
    end
    local challenge = { id = payload.id, from = sender, stake = payload.stake }
    local why = refusal(VXV.PlayerName(), true)
    if why ~= nil then
        Matches.Answer(challenge, false)
        VXV.AfterCombat(function()
            VXV.Print(sender .. " te défie au Chi Fou Mi. " .. why)
        end)
        return
    end
    VXV.Emit("chifoumi.challenged", challenge)
end)

VXV.OnMessage(ANSWER, function(payload, sender)
    local challenge = type(payload) == "table" and challenges[payload.id]
    if not challenge or challenge.target ~= sender then
        return
    end
    challenges[payload.id] = nil
    if payload.accepted ~= true then
        VXV.Print(sender .. " refuse ton Chi Fou Mi.")
        return
    end
    local me = VXV.PlayerName()
    VXV.Broadcast(START, { id = payload.id, a = me, b = sender, stake = challenge.stake, at = time() })
    VXV.SayToGuild(("Chi Fou Mi : %s contre %s pour %s. Paris ouverts une minute dans l'addon."):format(me, sender,
        VXV.Gold.Format(challenge.stake)))
end)

VXV.OnMessage(START, function(payload, sender)
    if type(payload) ~= "table" or payload.a ~= sender or type(payload.id) ~= "string" or type(payload.b) ~= "string"
        or stakeOf(payload.stake) == nil or type(payload.at) ~= "number" or Games.Find(payload.id) ~= nil then
        return
    end
    Games.Start({ id = payload.id, challenger = payload.a, challenged = payload.b, stake = payload.stake,
        acceptedAt = payload.at, closesAt = GetTime() + Rules.BETTING_SECONDS, rounds = {}, bets = {} })
    VXV.Emit("chifoumi.started", payload.id)
end)

--- Stakes on a player of the game during its minute of bets; returns why not, or nil.
function Matches.Bet(id, choice, amount)
    local game, me = Games.Find(id), VXV.PlayerName()
    if game == nil or not Rules.Betting(game) then
        return "Les paris de cette partie sont fermés."
    end
    if me == game.challenger or me == game.challenged then
        return "Les joueurs ne parient pas sur leur partie."
    end
    local why = refusal(me, true)
    if why ~= nil then
        return why
    end
    amount = stakeOf(amount)
    if amount == nil or amount < 1 then
        return "Mise d'au moins 1 po."
    end
    VXV.Broadcast(BET, { id = id, choice = choice, amount = amount })
    return nil
end

VXV.OnMessage(BET, function(payload, sender)
    if type(payload) == "table" and refusal(sender, true) == nil then
        Games.AddBet(payload.id, sender, payload.choice, payload.amount)
    end
end)

--- The player plays their move for the round: locked for the guild, told once the other player locked theirs.
function Matches.Play(id, move)
    local game, me = Games.Find(id), VXV.PlayerName()
    if not Games.Awaits(game, me) or not Rules.IsMove(move) then
        return
    end
    local round = #game.rounds + 1
    mine[id] = { round = round, move = move }
    VXV.Broadcast(LOCK, { id = id, round = round })
end

--- The player's move for the round being played, once locked.
function Matches.MyMove(id)
    local game, played = Games.Find(id), mine[id]
    return game and played and played.round == #game.rounds + 1 and played.move or nil
end

--- Once both players locked, this player's addon tells its move.
local function reveal(game)
    local played = mine[game.id]
    if Games.BothLocked(game) and played ~= nil and played.round == #game.rounds + 1 then
        VXV.Broadcast(REVEAL, { id = game.id, round = played.round, move = played.move })
    end
end

VXV.OnMessage(LOCK, function(payload, sender)
    if type(payload) == "table" and Games.Lock(payload.id, sender, payload.round) then
        reveal(Games.Find(payload.id))
    end
end)

VXV.OnMessage(REVEAL, function(payload, sender)
    if type(payload) == "table" and Games.Reveal(payload.id, sender, payload.round, payload.move) then
        VXV.Emit("chifoumi.played", payload.id)
    end
end)

--- The winner confirms the loser paid the stake.
function Matches.ConfirmPaid(id)
    VXV.Broadcast(PAID, { id = id, at = time() })
end

VXV.OnMessage(PAID, function(payload, sender)
    if type(payload) == "table" and type(payload.at) == "number" then
        Games.Pay(payload.id, sender, payload.at)
    end
end)
