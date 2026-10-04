local _, ns = ...

--- Small pure helpers shared by every file.
local Util = {}
ns.Util = Util

local SECRET_PLACEHOLDER = "<secret>"

--- True when the client flags the value as secret (Midnight-era restriction): it may not be compared nor stored.
function Util.IsSecret(value)
    return issecretvalue ~= nil and issecretvalue(value) == true
end

--- A printable string for any value, never touching a secret one.
function Util.Safe(value)
    if Util.IsSecret(value) then
        return SECRET_PLACEHOLDER
    end
    return tostring(value)
end
