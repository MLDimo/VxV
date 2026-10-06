local _, ns = ...

--- The pool and odds of a bet, as the website computes them (packages/server/src/domain/bets.ts): the
--- organisation's 10 % never exceeds the losing stakes, the rest is shared between the winners by their stakes.
local Book = {}
ns.Book = Book

local PERCENT, ORGANISATION_PERCENT = 100, 10
Book.ORGANISATION_PERCENT = ORGANISATION_PERCENT

--- A hundred times what the winners share when the choice staking `winning` po wins a pool of `pool` po.
local function distributed(pool, winning)
    return PERCENT * pool - math.min(ORGANISATION_PERCENT * pool, PERCENT * (pool - winning))
end

--- The pool, the bettors, and each choice's total, bettors, share (0 to 1) and odds (nil while nobody staked).
function Book.Of(bet)
    local pool, totals, bettors = 0, {}, {}
    for _, stake in ipairs(bet.stakes) do
        pool = pool + stake.amount
        totals[stake.choiceId] = (totals[stake.choiceId] or 0) + stake.amount
        bettors[stake.choiceId] = (bettors[stake.choiceId] or 0) + 1
    end
    local choices = {}
    for _, choice in ipairs(bet.choices) do
        local total = totals[choice.id] or 0
        choices[#choices + 1] = {
            choice = choice,
            total = total,
            bettors = bettors[choice.id] or 0,
            share = pool == 0 and 0 or total / pool,
            odds = total > 0 and distributed(pool, total) / (PERCENT * total) or nil,
        }
    end
    return { pool = pool, bettors = #bet.stakes, choices = choices }
end

--- What a stake brings back if its choice wins, as the pool stands, rounded down to the po.
function Book.Gain(book, choiceId, amount)
    for _, entry in ipairs(book.choices) do
        if entry.choice.id == choiceId and entry.odds ~= nil then
            return math.floor(amount * entry.odds)
        end
    end
    return 0
end
