local _, ns = ...

--- Small pure helpers shared by every file.
local Util = {}
ns.Util = Util

local SECRET_PLACEHOLDER = "<secret>"
local MAX_DESCRIBE_DEPTH = 2

--- True when the client flags the value as secret (Midnight-era restriction).
function Util.IsSecret(value)
    return issecretvalue ~= nil and issecretvalue(value) == true
end

local function describe(value, depth)
    if Util.IsSecret(value) then
        return SECRET_PLACEHOLDER
    end
    if type(value) ~= "table" then
        return tostring(value)
    end
    if depth >= MAX_DESCRIBE_DEPTH then
        return "{...}"
    end
    local fields = {}
    for key, field in pairs(value) do
        fields[#fields + 1] = tostring(key) .. "=" .. describe(field, depth + 1)
    end
    table.sort(fields)
    return "{" .. table.concat(fields, ", ") .. "}"
end

--- Converts any value to a printable string (tables shown two levels deep), never touching a secret value.
function Util.Safe(value)
    return describe(value, 0)
end

--- Joins every argument into one printable string, separated by spaces.
function Util.Join(...)
    local parts = {}
    for index = 1, select("#", ...) do
        parts[index] = Util.Safe((select(index, ...)))
    end
    return table.concat(parts, " ")
end

--- Returns the name of an Enum code ("Success"), or the raw value when unknown.
function Util.EnumName(enumName, value)
    local codes = Enum and Enum[enumName]
    if codes and not Util.IsSecret(value) then
        for name, code in pairs(codes) do
            if code == value then
                return name
            end
        end
    end
    return Util.Safe(value)
end

--- Splits "word rest of text" into "word" and "rest of text" (empty strings when absent).
function Util.SplitFirst(text)
    local first, rest = (text or ""):match("^%s*(%S*)%s*(.-)%s*$")
    return first, rest
end

--- Formats a Unix timestamp the same way everywhere.
function Util.FormatTime(timestamp)
    if not timestamp or timestamp == 0 then
        return "jamais"
    end
    return date("%Y-%m-%d %H:%M:%S", timestamp)
end
