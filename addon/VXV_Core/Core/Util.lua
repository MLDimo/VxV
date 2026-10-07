local _, ns = ...

--- Small pure helpers shared by every file.
local Util = {}
ns.Util = Util

--- True when the client flags the value as secret (Midnight-era restriction): it may not be compared nor stored.
function Util.IsSecret(value)
    return issecretvalue ~= nil and issecretvalue(value) == true
end

--- "1 personnage", "3 personnages": French agreement of a counted word.
function Util.Count(value, singular, plural)
    return value .. " " .. (value == 1 and singular or plural or singular .. "s")
end
