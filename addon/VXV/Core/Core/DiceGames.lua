local ns = select(2, ...).Core

--- What Le Dé Pipé's games share (deathroll, Chi Fou Mi): the lines of the website's data (VXV-DEATHROLLS-3,
--- VXV-CHIFOUMIS-3, packages/server/src/domain/addonGames.ts), and their ledger: the debts as the website knows them
--- and as the games over this addon kept tell (the website may not have them yet), who is barred, each player's
--- history of debts and the latest games.
local DiceGames = {}
ns.DiceGames = DiceGames

local Gold, SiteData = ns.Gold, ns.SiteData

-- The latest games the lists show, and the debts of a player's history.
local LATEST_SHOWN, HISTORY_SHOWN = 10, 20
local DATE = "%d/%m"

--- The part's part of empty data.
function DiceGames.New()
    return { owed = {}, newcomers = {}, portraits = {}, unpaid = {}, latest = {} }
end

local function number(value)
    return tonumber(value)
end

--- The lines of the website's data, for VXV.SiteData.
DiceGames.LINES = {
    -- L;debt limit
    L = { 1, function(data, f)
        data.limit = number(f[1])
        return data.limit ~= nil
    end },
    -- X;member id;owed
    X = { 2, function(data, f)
        data.owed[f[1]] = number(f[2])
        return data.owed[f[1]] ~= nil
    end },
    -- N;member id
    N = { 1, function(data, f)
        data.newcomers[f[1]] = true
        return true
    end },
    -- A;member id;portrait
    A = { 2, function(data, f)
        data.portraits[f[1]] = f[2]
        return true
    end },
    -- D;game id;loser's member id;loser;winner's member id;winner;stake;ended
    D = { 7, function(data, f)
        local stake, endedAt = number(f[6]), number(f[7])
        data.unpaid[#data.unpaid + 1] = { id = f[1], loser = f[3], winner = f[5], stake = stake, endedAt = endedAt }
        return stake ~= nil and endedAt ~= nil
    end },
    -- H;game id;winner;loser;stake;ended;paid
    H = { 6, function(data, f)
        local stake, endedAt = number(f[4]), number(f[5])
        data.latest[#data.latest + 1] = { id = f[1], winner = f[2], loser = f[3], stake = stake, endedAt = endedAt,
            paid = f[6] == "1" }
        return stake ~= nil and endedAt ~= nil
    end },
}

local function memberOf(data, name)
    return name ~= nil and SiteData.MemberOf(data, name) or nil
end

--- Whether the website says the character's member lacks the role « Membre »; without its data, nobody does.
function DiceGames.Newcomer(data, name)
    local memberId = memberOf(data, name)
    return memberId ~= nil and data.newcomers[memberId] == true
end

--- The file of the character's member's portrait, or nil without the website's data or a portrait. The core's
--- portraits are its interface's (RankingBoard, loaded after this file): read when asked.
function DiceGames.Portrait(data, name)
    local memberId = memberOf(data, name)
    return memberId and ns.RankingBoard.Avatar(data.portraits[memberId]) or nil
end

local function newestFirst(left, right)
    return left.endedAt > right.endedAt
end

--- The debts between the players of these unpaid games, pair by pair (owner's request of 9 November): each pair's
--- games set against each other, { debtor, creditor, amount (0 when they cancel out), ids }. key(name) tells a player.
local function pairsOf(games, key)
    local byPair, order = {}, {}
    for _, game in ipairs(games) do
        local loser, winner = key(game.loser), key(game.winner)
        local id = loser < winner and loser .. "|" .. winner or winner .. "|" .. loser
        local pair = byPair[id]
        if pair == nil then
            pair = { names = {}, lost = {}, ids = {} }
            byPair[id], order[#order + 1] = pair, id
        end
        pair.names[loser], pair.names[winner] = pair.names[loser] or game.loser, pair.names[winner] or game.winner
        pair.lost[loser] = (pair.lost[loser] or 0) + game.stake
        pair.lost[winner] = pair.lost[winner] or 0
        pair.ids[#pair.ids + 1] = game.id
    end
    local list = {}
    for _, id in ipairs(order) do
        local pair = byPair[id]
        local first, second = id:match("^(.-)|(.*)$")
        local owes = pair.lost[first] - pair.lost[second]
        list[#list + 1] = { debtor = pair.names[owes >= 0 and first or second],
            creditor = pair.names[owes >= 0 and second or first], amount = math.abs(owes), ids = pair.ids }
    end
    return list
end

--- What the character owes in these pairs.
local function owedIn(debts, name)
    local owed = 0
    for _, pair in ipairs(debts) do
        if pair.debtor == name then
            owed = owed + pair.amount
        end
    end
    return owed
end

--- The ledger of a game's debts, from the website's data (or nil) and the games over this addon kept ({ [id] =
--- game }), whose winner and loser rules tell (rules.Winner, rules.Loser). Each game of its lists: { id, winner,
--- loser, stake, endedAt, paid }; two players' debts are set against each other.
function DiceGames.Ledger(data, over, rules)
    local ledger = {}
    local known, ours = {}, {}
    for _, game in ipairs(data and data.unpaid or {}) do
        known[game.id] = true
    end
    for _, game in ipairs(data and data.latest or {}) do
        known[game.id] = true
    end
    for id, game in pairs(over) do
        ours[id] = { id = id, winner = rules.Winner(game), loser = rules.Loser(game), stake = game.stake,
            endedAt = game.endedAt, paid = game.paid ~= nil }
    end

    --- A player: their member, else their name.
    local function key(name)
        return memberOf(data, name) or ("name:" .. name)
    end

    --- The games over the website does not know yet.
    local function unknown()
        local list = {}
        for id, game in pairs(ours) do
            if not known[id] then
                list[#list + 1] = game
            end
        end
        return list
    end

    --- The unpaid games with a stake: the website's, less those whose payment was confirmed here since, and the
    --- games over it does not know yet.
    local function unpaidGames()
        local list = {}
        for _, game in ipairs(data and data.unpaid or {}) do
            if not (ours[game.id] and ours[game.id].paid) then
                list[#list + 1] = game
            end
        end
        for _, game in ipairs(unknown()) do
            if game.stake > 0 and not game.paid then
                list[#list + 1] = game
            end
        end
        return list
    end

    --- What each player owes another, their games set against each other: { id (a game of theirs), ids, winner (the
    --- one owed), loser (the one who owes), stake (the difference) }; the pairs whose debts cancel out left aside.
    function ledger.Unpaid()
        local list = {}
        for _, pair in ipairs(pairsOf(unpaidGames(), key)) do
            if pair.amount > 0 then
                list[#list + 1] = { id = pair.ids[1], ids = pair.ids, winner = pair.creditor, loser = pair.debtor,
                    stake = pair.amount }
            end
        end
        return list
    end

    --- What the character's member owes: as the website knows it (bets and games), with this game's debts as they
    --- stand here (payments confirmed and games over since).
    function ledger.Owed(name)
        local memberId = memberOf(data, name)
        local site = memberId and data.owed[memberId] or 0
        return site - owedIn(pairsOf(data and data.unpaid or {}, key), name) + owedIn(pairsOf(unpaidGames(), key), name)
    end

    --- Whether the character's member owes the website's limit or more: barred from bets and games. Without the
    --- website's data, nobody is.
    function ledger.Barred(name)
        return data ~= nil and data.limit ~= nil and ledger.Owed(name) >= data.limit
    end

    --- The games the website lists and those it does not know yet, the latest first; an unpaid game whose players'
    --- debts cancel out is « cancelled ».
    local function all()
        local cancelled = {}
        for _, pair in ipairs(pairsOf(unpaidGames(), key)) do
            for _, id in ipairs(pair.ids) do
                cancelled[id] = pair.amount == 0
            end
        end
        local list = unknown()
        for _, game in ipairs(data and data.latest or {}) do
            list[#list + 1] = ours[game.id] and { id = game.id, winner = game.winner, loser = game.loser,
                stake = game.stake, endedAt = game.endedAt, paid = game.paid or ours[game.id].paid } or game
        end
        for index, game in ipairs(list) do
            if not game.paid and cancelled[game.id] then
                list[index] = { id = game.id, winner = game.winner, loser = game.loser, stake = game.stake,
                    endedAt = game.endedAt, paid = false, cancelled = true }
            end
        end
        table.sort(list, newestFirst)
        return list
    end

    --- The character's debts, paid or not: the games with a stake they lost or won, the latest first.
    function ledger.History(name)
        local list = {}
        for _, game in ipairs(all()) do
            if game.stake > 0 and (game.winner == name or game.loser == name) and #list < HISTORY_SHOWN then
                list[#list + 1] = game
            end
        end
        return list
    end

    --- The latest games over.
    function ledger.Latest()
        local list = {}
        for _, game in ipairs(all()) do
            if #list < LATEST_SHOWN then
                list[#list + 1] = game
            end
        end
        return list
    end

    return ledger
end

--- A game over in a list: « Thom Leboss bat Vorn Cendrelune · 500 po · 09/11 ».
function DiceGames.GameText(game)
    return ("%s bat %s · %s · %s"):format(game.winner, game.loser, Gold.Format(game.stake), date(DATE, game.endedAt))
end

--- A debt of the player's history: « Tu devais 500 po à Thom Leboss · 09/11 · payée » (or « annulée » when the
--- players' debts cancel out, « à payer »).
function DiceGames.HistoryText(game, me)
    local debt = game.loser == me and ("Tu devais %s à %s"):format(Gold.Format(game.stake), game.winner)
        or ("%s te devait %s"):format(game.loser, Gold.Format(game.stake))
    local state = game.paid and "payée" or (game.cancelled and "annulée" or "à payer")
    return ("%s · %s · %s"):format(debt, date(DATE, game.endedAt), state)
end

--- A player's name in their class color, as the guild's list tells it.
local function colored(name)
    for _, member in ipairs(ns.Roster.Read()) do
        if member.name == name then
            return ns.Theme.ClassColored(name, member.class)
        end
    end
    return name
end

--- A game being played, in the list of a tab (owner's request of 10 November: it shows at a glance): « EN DIRECT
--- Thom Leboss contre Vorn Cendrelune · 500 po », and « ta partie » for the player's own.
function DiceGames.LiveText(game, me)
    local mine = me == game.challenger or me == game.challenged
    return ("%s  %s contre %s · %s%s"):format(ns.Theme.Colored("EN DIRECT", "neon"), colored(game.challenger),
        colored(game.challenged), Gold.Format(game.stake), mine and (" · " .. ns.Theme.Colored("ta partie", "gold"))
        or "")
end
