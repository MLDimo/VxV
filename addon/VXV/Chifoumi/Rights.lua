local ns = select(2, ...).Chifoumi

--- Who may play or bet (P15.6, decision of 10 October): not a member in debt (bets, deathrolls, Chi Fou Mi), as the
--- website knows it and as the games over since its data tell, nor a member without the role « Membre » on Discord.
--- Without the website's data, nobody is barred.
local Rights = {}
ns.Rights = Rights

local ChifoumiData, Games, Rules = ns.ChifoumiData, ns.Games, ns.Rules

local function memberOf(name)
    local data = ChifoumiData.Current()
    return data, name ~= nil and VXV.MemberOf(data, name) or nil
end

--- The unpaid games with a stake: the website's, and those over since its data were exported (it cannot know them
--- yet). Each: { id, winner, loser, stake }.
function Rights.Unpaid()
    local list, known = {}, {}
    local data = ChifoumiData.Current()
    for _, game in ipairs(data and data.unpaid or {}) do
        known[game.id] = true
        local stored = Games.Over()[game.id]
        if stored == nil or stored.paid == nil then
            list[#list + 1] = { id = game.id, winner = game.winner, loser = game.loser, stake = game.stake }
        end
    end
    local exportedAt = ChifoumiData.ExportedAt()
    for _, game in pairs(Games.Over()) do
        if not known[game.id] and game.paid == nil and game.stake > 0 and game.endedAt > exportedAt then
            list[#list + 1] = { id = game.id, winner = Rules.Winner(game), loser = Rules.Loser(game),
                stake = game.stake }
        end
    end
    return list
end

--- Whether the character's member is in debt.
function Rights.InDebt(name)
    local data, memberId = memberOf(name)
    if memberId ~= nil and data.barred[memberId] then
        return true
    end
    for _, game in ipairs(Rights.Unpaid()) do
        if game.loser == name then
            return true
        end
    end
    return false
end

--- Whether the website says the character's member lacks the role « Membre ».
function Rights.Newcomer(name)
    local data, memberId = memberOf(name)
    return memberId ~= nil and data.newcomers[memberId] == true
end
