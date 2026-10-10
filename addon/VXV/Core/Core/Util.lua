local ns = select(2, ...).Core

--- Small pure helpers shared by every file.
local Util = {}
ns.Util = Util

--- True when the client flags the value as secret (Midnight-era restriction): it may not be compared nor stored.
function Util.IsSecret(value)
    return issecretvalue ~= nil and issecretvalue(value) == true
end

local SECONDS_PER_MINUTE, SECONDS_PER_HOUR, SECONDS_PER_DAY = 60, 3600, 86400

--- A time left: "2 j 04 h", "4 h 05", "12 min".
function Util.Remaining(seconds)
    local days = math.floor(seconds / SECONDS_PER_DAY)
    local hours = math.floor(seconds % SECONDS_PER_DAY / SECONDS_PER_HOUR)
    local minutes = math.floor(seconds % SECONDS_PER_HOUR / SECONDS_PER_MINUTE)
    if days > 0 then
        return string.format("%d j %02d h", days, hours)
    elseif hours > 0 then
        return string.format("%d h %02d", hours, minutes)
    end
    return minutes .. " min"
end

--- "1 personnage", "3 personnages": French agreement of a counted word.
function Util.Count(value, singular, plural)
    return value .. " " .. (value == 1 and singular or plural or singular .. "s")
end
