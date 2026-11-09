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

--- The ledger of a game's debts, from the website's data (or nil) and the games over this addon kept ({ [id] =
--- game }), whose winner and loser rules tell (rules.Winner, rules.Loser). Each game of its lists: { id, winner,
--- loser, stake, endedAt, paid }.
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

    --- The unpaid games with a stake: the website's, less those whose winner confirmed the payment here since, and
    --- the games over it does not know yet.
    function ledger.Unpaid()
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

    --- What the character's member owes: as the website knows it (bets and games), less the payments confirmed here
    --- since, with the games lost since.
    function ledger.Owed(name)
        local memberId = memberOf(data, name)
        local owed = memberId and data.owed[memberId] or 0
        for _, game in ipairs(data and data.unpaid or {}) do
            if game.loser == name and ours[game.id] and ours[game.id].paid then
                owed = owed - game.stake
            end
        end
        for _, game in ipairs(unknown()) do
            if game.loser == name and not game.paid then
                owed = owed + game.stake
            end
        end
        return owed
    end

    --- Whether the character's member owes the website's limit or more: barred from bets and games. Without the
    --- website's data, nobody is.
    function ledger.Barred(name)
        return data ~= nil and data.limit ~= nil and ledger.Owed(name) >= data.limit
    end

    --- The games the website lists and those it does not know yet, the latest first.
    local function all()
        local list = unknown()
        for _, game in ipairs(data and data.latest or {}) do
            list[#list + 1] = ours[game.id] and { id = game.id, winner = game.winner, loser = game.loser,
                stake = game.stake, endedAt = game.endedAt, paid = game.paid or ours[game.id].paid } or game
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

--- A debt of the player's history: « Tu devais 500 po à Thom Leboss · 09/11 · payée ».
function DiceGames.HistoryText(game, me)
    local debt = game.loser == me and ("Tu devais %s à %s"):format(Gold.Format(game.stake), game.winner)
        or ("%s te devait %s"):format(game.loser, Gold.Format(game.stake))
    return ("%s · %s · %s"):format(debt, date(DATE, game.endedAt), game.paid and "payée" or "à payer")
end
