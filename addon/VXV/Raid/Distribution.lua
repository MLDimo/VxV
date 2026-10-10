local ns = select(2, ...).Raid

--- Giving the boss's items (plan 6.2 to 6.6). The master looter picks an item; the addon applies the rules, tells
--- each member what they may do, announces each step in the group's channel, follows the rolls, and gives the item
--- to the winner. Members only ever follow the master looter's addon.
local Distribution = {}
ns.Distribution = Distribution

local Attribution, BossLoot, EventData, Group, RaidData = ns.Attribution, ns.BossLoot, ns.EventData, ns.Group,
    ns.RaidData

local START, FINISH = "loot.start", "loot.finish"
local ROLL_SECONDS = 30
local ROLL_MIN, ROLL_MAX = 1, 100
local MAX_CANDIDATES = 40

-- Announcements in the group's channel (plan 6.5).
local SAY_RESERVED = "%s : SR de %s. Eux seuls roll (30 s)."
local SAY_FREE = "%s : aucune SR, tout le monde peut roll (30 s)."
local SAY_FREE_WEARERS = "%s : aucune SR, roll libre pour les classes qui peuvent l'équiper (30 s)."
local SAY_DIRECT = "%s : SR de %s, attribué sans roll."
local SAY_COUNCIL = "%s : pas de roll, attribué par l'organisation (loot council)."
local SAY_WINNER = "%s : %s gagne (%s)."
local SAY_TIE = "%s : égalité entre %s (%d). Relancez (30 s)."
local SAY_NO_RESERVED_ROLL = "%s : aucune SR n'a roll, l'objet passe en roll libre (30 s)."
local SAY_NO_ROLL = "%s : personne n'a roll, l'organisation l'attribue."
-- Each member's message (plan 6.2).
local TELL_RESERVED = "Tu as une SR : fais ton roll."
local TELL_BONUS = " Ton SR+ ajoute %d."
local TELL_RESERVED_OTHERS = "Objet SR par %s : tu ne peux pas roll."
local TELL_FREE = "Aucune SR : tu peux roll."
local TELL_UNFIT = "Ta classe ne peut pas équiper cet objet : pas de roll pour toi."
local TELL_TIE = "Égalité : relance ton roll."
local TELL_TIE_OTHERS = "Égalité entre %s : eux seuls relancent."
local TELL_COUNCIL = "Ce loot n'est pas disponible au roll : l'organisation l'attribue (loot council)."
local TELL_DIRECT_ME = "Tu avais la seule SR : l'objet est pour toi."
local TELL_DIRECT_OTHER = "Objet SR par %s : attribué sans roll."
local TELL_WINNER = "%s gagne."
local BUSY = "Une attribution est déjà en cours : termine-la ou annule-la."
local CANNOT_RECEIVE = "%s ne peut pas recevoir l'objet : rouvre le corps, ou vérifie qu'il est assez près."

-- The master looter's attribution: { item, plan, round, result = { winner, method } }.
local active
-- What every member sees: { link, message, canRoll, rolled, quiet (nothing to do: the panel does not open) }.
local shown
local roundNumber = 0

local function changed()
    VXV.Emit("loot.distribution")
end

local function isMasterLooter()
    local ok, yes = VXV.Compat.IsMasterLooter()
    return ok and yes == true
end

--- "Thom Leboss (+20), Ciel Gris".
local function withBonuses(players)
    local parts = {}
    for _, player in ipairs(players) do
        parts[#parts + 1] = player.name .. (player.bonus > 0 and (" (+" .. player.bonus .. ")") or "")
    end
    return table.concat(parts, ", ")
end

local function say(format, ...)
    VXV.SayToGroup(format:format(active.item.link, ...))
end

local function broadcastStart(eligible, tie)
    VXV.Broadcast(START, {
        itemId = active.item.itemId,
        link = active.item.link,
        mode = active.plan.mode,
        eligible = eligible,
        winner = active.result and active.result.winner,
        tie = tie,
    }, Group.Channel())
end

--- The group's members whose class may not equip the item.
local function unfit(itemId)
    local event, names = RaidData.Current(), {}
    for name, class in pairs(Group.Classes()) do
        if not EventData.CanEquip(event, itemId, class) then
            names[name] = true
        end
    end
    return names
end

local finishRound

--- Opens a roll window: players lists who may roll { name, bonus }, or nil for every member of the group whose
--- class may equip the item.
local function startRound(players, tie)
    roundNumber = roundNumber + 1
    local number, bonuses = roundNumber, nil
    if players ~= nil then
        bonuses = {}
        for _, player in ipairs(players) do
            bonuses[player.name] = player.bonus
        end
    end
    active.round = { bonuses = bonuses, inGroup = Group.Names(), unfit = unfit(active.item.itemId), rolled = {},
        rolls = {} }
    broadcastStart(players, tie)
    C_Timer.After(ROLL_SECONDS, function()
        if active ~= nil and roundNumber == number then
            finishRound()
        end
    end)
    changed()
end

local function totalText(round, name, roll)
    local bonus = round.bonuses and round.bonuses[name] or 0
    return bonus > 0 and string.format("%d + %d = %d", roll, bonus, roll + bonus) or tostring(roll)
end

local function rollOf(round, name)
    for _, roll in ipairs(round.rolls) do
        if roll.valid and roll.name == name then
            return roll.roll
        end
    end
end

finishRound = function()
    local round = active.round
    round.finished = true
    local winners, best = Attribution.Best(round, round.rolls)
    if #winners == 1 then
        local winner = winners[1]
        say(SAY_WINNER, winner, totalText(round, winner, rollOf(round, winner)))
        active.result = { winner = winner, method = Attribution.Method(active.plan.mode, round.bonuses and
            round.bonuses[winner]) }
        VXV.Broadcast(FINISH, { itemId = active.item.itemId, winner = winner }, Group.Channel())
    elseif #winners > 1 then
        local tied = {}
        for _, name in ipairs(winners) do
            tied[#tied + 1] = { name = name, bonus = round.bonuses and round.bonuses[name] or 0 }
        end
        say(SAY_TIE, table.concat(winners, ", "), best)
        startRound(tied, true)
        return
    elseif active.plan.mode == "reserved" then
        say(SAY_NO_RESERVED_ROLL)
        active.plan = { mode = "free", reservers = {} }
        startRound(nil)
        return
    else
        say(SAY_NO_ROLL)
        active.plan = { mode = "council", reservers = {} }
        broadcastStart()
    end
    changed()
end

--- The master looter starts giving an item of the boss's loot ({ slot, itemId, link }).
function Distribution.Start(item)
    if active ~= nil then
        VXV.Print(BUSY)
        return
    end
    local plan = Attribution.Plan(RaidData.Current(), item.itemId, Group.Names())
    active = { item = item, plan = plan }
    if plan.mode == "council" then
        say(SAY_COUNCIL)
        broadcastStart()
    elseif plan.mode == "direct" then
        local reserver = plan.reservers[1]
        active.result = { winner = reserver.name, method = Attribution.Method("direct", reserver.bonus) }
        say(SAY_DIRECT, withBonuses(plan.reservers))
        broadcastStart()
    elseif plan.mode == "reserved" then
        say(SAY_RESERVED, withBonuses(plan.reservers))
        startRound(plan.reservers)
        return
    else
        say(next(unfit(item.itemId)) == nil and SAY_FREE or SAY_FREE_WEARERS)
        startRound(nil)
        return
    end
    changed()
end

--- How a give of this slot to this player is recorded: the attribution's method for its winner, else the loot
--- council (the organisation chose).
function Distribution.MethodFor(slot, winner)
    if active ~= nil and active.item.slot == slot and active.result ~= nil and active.result.winner == winner then
        return active.result.method
    end
    return "loot_council"
end

local function finish(winner)
    VXV.Broadcast(FINISH, { itemId = active.item.itemId, winner = winner, done = true }, Group.Channel())
    active = nil
    changed()
end

--- The master looter gives the item to this player, through the game's master loot.
function Distribution.Give(name)
    local slot = active and active.item.slot
    for index = 1, slot and MAX_CANDIDATES or 0 do
        local ok, candidate = VXV.Compat.GetMasterLootCandidate(slot, index)
        if ok and candidate == name then
            if VXV.Compat.GiveMasterLoot(slot, index) then
                finish(name)
                return
            end
            break
        end
    end
    VXV.Print(CANNOT_RECEIVE:format(name))
end

--- The master looter stops the attribution in progress.
function Distribution.Cancel()
    if active ~= nil then
        finish(nil)
    end
end

--- A member rolls from the panel's button.
function Distribution.Roll()
    VXV.Compat.RandomRoll(ROLL_MIN, ROLL_MAX)
    shown.rolled = true
    changed()
end

--- The master looter's attribution, or nil; and what this member sees, or nil.
function Distribution.State()
    return active, shown
end

VXV.On("roll", function(roll)
    local round = active and active.round
    if round == nil or round.finished then
        return
    end
    local valid, reason = Attribution.Judge(round, roll)
    if valid then
        round.rolled[roll.name] = true
    end
    round.rolls[#round.rolls + 1] = { name = roll.name, roll = roll.roll, valid = valid, reason = reason }
    changed()
end)

local function find(players, name)
    for _, player in ipairs(players) do
        if player.name == name then
            return player
        end
    end
end

local function playerNames(players)
    local names = {}
    for _, player in ipairs(players) do
        names[#names + 1] = player.name
    end
    return table.concat(names, ", ")
end

--- Whether the player's class may equip the item, as the event's data say.
local function canEquip(itemId)
    local _, class = UnitClass("player")
    return EventData.CanEquip(RaidData.Current(), itemId, not VXV.IsSecret(class) and class or nil)
end

--- The member's message, whether they may roll, and whether there is nothing for them to do (a free roll on an item
--- their class may not equip: the panel does not open).
local function tell(payload, me)
    if payload.mode == "council" then
        return TELL_COUNCIL, false
    elseif payload.mode == "direct" then
        return payload.winner == me and TELL_DIRECT_ME or TELL_DIRECT_OTHER:format(tostring(payload.winner)), false
    elseif type(payload.eligible) ~= "table" then
        if not canEquip(payload.itemId) then
            return TELL_UNFIT, false, true
        end
        return TELL_FREE, true
    end
    local mine = find(payload.eligible, me)
    if mine ~= nil and payload.tie then
        return TELL_TIE, true
    elseif mine ~= nil then
        return TELL_RESERVED .. ((tonumber(mine.bonus) or 0) > 0 and TELL_BONUS:format(mine.bonus) or ""), true
    end
    local others = payload.tie and TELL_TIE_OTHERS or TELL_RESERVED_OTHERS
    return others:format(playerNames(payload.eligible)), false
end

local function fromMasterLooter(sender)
    return sender == VXV.PlayerName() or sender == BossLoot.MasterLooter()
end

VXV.OnMessage(START, function(payload, sender)
    if type(payload) ~= "table" or type(payload.link) ~= "string" or not fromMasterLooter(sender) then
        return
    end
    local message, canRoll, quiet = tell(payload, VXV.PlayerName())
    shown = { link = payload.link, message = message, canRoll = canRoll, rolled = false, quiet = quiet }
    changed()
end)

VXV.OnMessage(FINISH, function(payload, sender)
    if type(payload) ~= "table" or shown == nil or not fromMasterLooter(sender) then
        return
    end
    if payload.done then
        shown = nil
    elseif type(payload.winner) == "string" then
        shown.message, shown.canRoll = TELL_WINNER:format(payload.winner), false
    end
    changed()
end)

--- Whether the player is the master looter, who picks the items and gives them.
Distribution.IsMasterLooter = isMasterLooter
