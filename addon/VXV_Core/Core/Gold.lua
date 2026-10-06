local _, ns = ...

--- Amounts in gold pieces, written as the website writes them: "1 000 po", "+500 po", "× 4,50" (VXV.Gold).
local Gold = {}
ns.Gold = Gold

local MINUS = "−"

--- "1 000 po".
function Gold.Format(amount)
    local digits = tostring(math.floor(math.abs(amount)))
    local grouped = digits:reverse():gsub("(%d%d%d)", "%1 "):reverse():gsub("^ ", "")
    return (amount < 0 and MINUS or "") .. grouped .. " po"
end

--- "+500 po", "−120 po".
function Gold.Signed(amount)
    return (amount > 0 and "+" or "") .. Gold.Format(amount)
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
