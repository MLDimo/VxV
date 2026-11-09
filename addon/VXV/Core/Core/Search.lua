local ns = select(2, ...).Core

--- Texts searched as a player types them: without accents nor case (« Qui peut fabriquer… ? » of the Artisans, the
--- member to challenge in Le Dé Pipé).
local Search = {}
ns.Search = Search

-- French letters and ligatures (two bytes in UTF-8), as plain letters.
local FOLDED = {
    ["à"] = "a", ["â"] = "a", ["ä"] = "a", ["á"] = "a", ["À"] = "a", ["Â"] = "a", ["Ä"] = "a",
    ["ç"] = "c", ["Ç"] = "c",
    ["é"] = "e", ["è"] = "e", ["ê"] = "e", ["ë"] = "e", ["É"] = "e", ["È"] = "e", ["Ê"] = "e", ["Ë"] = "e",
    ["î"] = "i", ["ï"] = "i", ["í"] = "i", ["Î"] = "i", ["Ï"] = "i",
    ["ô"] = "o", ["ö"] = "o", ["ó"] = "o", ["Ô"] = "o", ["Ö"] = "o",
    ["ù"] = "u", ["û"] = "u", ["ü"] = "u", ["ú"] = "u", ["Ù"] = "u", ["Û"] = "u", ["Ü"] = "u",
    ["ÿ"] = "y", ["ñ"] = "n", ["œ"] = "oe", ["Œ"] = "oe", ["æ"] = "ae", ["Æ"] = "ae",
}
local TWO_BYTES = "[\195\197][\128-\191]"

--- "Œufs  aux Herbes" → "oeufs aux herbes".
function Search.Fold(text)
    local folded = text:gsub(TWO_BYTES, FOLDED):lower():gsub("%s+", " ")
    return (folded:gsub("^ ", ""):gsub(" $", ""))
end

--- Whether a name holds every word searched, accents and case aside; nothing searched matches nothing.
function Search.Matches(search, name)
    local folded, found = Search.Fold(name), false
    for word in Search.Fold(search):gmatch("%S+") do
        if not folded:find(word, 1, true) then
            return false
        end
        found = true
    end
    return found
end
