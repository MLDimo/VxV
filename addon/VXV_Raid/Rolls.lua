local _, ns = ...

--- The /roll results the game writes in the system channel, read with its own format (RANDOM_ROLL_RESULT):
--- "Ðéjà Vu obtient un 98 (1-100)." Secret during a boss encounter, readable after it (measured in phase 0).
local Rolls = {}
ns.Rolls = Rolls

local STRING_MARKER, NUMBER_MARKER = "\1", "\2"

local pattern

--- A Lua pattern capturing each value of a Blizzard format string ("%s obtient un %d (%d-%d).").
local function formatToPattern(format)
    local escaped = format:gsub("%%%d*%$?s", STRING_MARKER):gsub("%%%d*%$?d", NUMBER_MARKER)
    escaped = escaped:gsub("[%^%$%(%)%%%.%[%]%*%+%-%?]", "%%%0")
    return "^" .. escaped:gsub(STRING_MARKER, "(.+)"):gsub(NUMBER_MARKER, "(%%d+)") .. "$"
end

--- { name, roll, low, high } of a system message, or nil when it is not a readable roll.
function Rolls.Parse(text)
    if type(text) ~= "string" or VXV.IsSecret(text) or type(RANDOM_ROLL_RESULT) ~= "string" then
        return nil
    end
    pattern = pattern or formatToPattern(RANDOM_ROLL_RESULT)
    local name, roll, low, high = text:match(pattern)
    if name == nil then
        return nil
    end
    return { name = name, roll = tonumber(roll), low = tonumber(low), high = tonumber(high) }
end

VXV.OnEvent("CHAT_MSG_SYSTEM", function(text)
    local roll = Rolls.Parse(text)
    if roll ~= nil then
        VXV.Emit("raid.roll", roll)
    end
end)
