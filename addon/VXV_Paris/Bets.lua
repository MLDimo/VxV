local _, ns = ...

--- The bets of the data for this player: the open ones, their stake on each and their debt; and how the data
--- travel between the guild's addons (the core's shared data).
local Bets = {}
ns.Bets = Bets

--- The website's id of the player's member, found by the character played; nil when it is linked to nobody.
function Bets.MemberId(data)
    return data ~= nil and data.members[VXV.PlayerName() or ""] or nil
end

--- True while stakes are taken: before the closing time, unless an officer ended the bet.
function Bets.IsOpen(bet, now)
    return bet.endedAt == nil and now < bet.closesAt
end

--- The open bets, closing soonest first.
function Bets.Open(data, now)
    local open = {}
    for _, bet in ipairs(data ~= nil and data.bets or {}) do
        if Bets.IsOpen(bet, now) then
            open[#open + 1] = bet
        end
    end
    table.sort(open, function(left, right)
        return left.closesAt < right.closesAt
    end)
    return open
end

--- The member's stake on the bet, or nil.
function Bets.StakeOf(bet, memberId)
    for _, stake in ipairs(bet.stakes) do
        if stake.memberId == memberId then
            return stake
        end
    end
    return nil
end

--- The label of one of the bet's choices.
function Bets.ChoiceLabel(bet, choiceId)
    for _, choice in ipairs(bet.choices) do
        if choice.id == choiceId then
            return choice.label
        end
    end
    return ""
end

--- What the member owes: the stakes they lost without paying them.
function Bets.Debt(data, memberId)
    local debt = 0
    for _, bet in ipairs(data ~= nil and data.bets or {}) do
        local stake = Bets.StakeOf(bet, memberId)
        if stake ~= nil and stake.standing == "debt" then
            debt = debt + stake.amount
        end
    end
    return debt
end
