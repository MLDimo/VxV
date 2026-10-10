local ns = select(2, ...).Core

--- Amounts in gold pieces, written as the website writes them: "1 000 po", "+500 po", "× 4,50" (VXV.Gold).
local Gold = {}
ns.Gold = Gold

local MINUS = "−"

--- "1 000", "−120": a whole number with its thousands separated.
function Gold.Number(amount)
    local digits = tostring(math.floor(math.abs(amount)))
    local grouped = digits:reverse():gsub("(%d%d%d)", "%1 "):reverse():gsub("^ ", "")
    return (amount < 0 and MINUS or "") .. grouped
end

--- "1 000 po".
function Gold.Format(amount)
    return Gold.Number(amount) .. " po"
end

--- "+500", "−120": a number with its sign, as the Ranking's places write gold.
function Gold.SignedNumber(amount)
    return (amount > 0 and "+" or "") .. Gold.Number(amount)
end

--- "+500 po", "−120 po".
function Gold.Signed(amount)
    return Gold.SignedNumber(amount) .. " po"
end

--- What one po brings back: "× 4,50"; a dash while nobody staked on the choice.
function Gold.Odds(odds)
    if odds == nil then
        return "—"
    end
    return (("× %.2f"):format(odds):gsub("%.", ","))
end

--- A share from 0 to 1 as a whole percentage: "42 %".
function Gold.Share(share)
    return ("%d %%"):format(math.floor(share * 100 + 0.5))
end
