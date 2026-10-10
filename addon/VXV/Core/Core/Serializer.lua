local ns = select(2, ...).Core

--- Turns Lua data (strings, numbers, booleans, nested tables) into text an addon message can carry, and back.
--- Strings are prefixed with their length, so nothing needs escaping. Decoding never raises a Lua error.
local Serializer = {}
ns.Serializer = Serializer

-- Deep enough for any VXV data; guards the decoder against a malicious message.
local MAX_DEPTH = 16
-- Enough digits to read back exactly the same number.
local NUMBER_FORMAT = "%.17g"

local function write(value, parts, depth)
    local kind = type(value)
    if kind == "string" then
        parts[#parts + 1] = "s" .. #value .. ":" .. value
    elseif kind == "number" then
        parts[#parts + 1] = "n" .. string.format(NUMBER_FORMAT, value) .. ";"
    elseif kind == "boolean" then
        parts[#parts + 1] = value and "T" or "F"
    elseif kind == "table" and depth < MAX_DEPTH then
        parts[#parts + 1] = "t"
        for key, field in pairs(value) do
            write(key, parts, depth + 1)
            write(field, parts, depth + 1)
        end
        parts[#parts + 1] = "e"
    else
        error("VXV: cannot send this data (" .. kind .. ")", 0)
    end
end

--- Text of the value. Functions, or tables nested too deep, are programming errors.
function Serializer.Encode(value)
    local parts = {}
    write(value, parts, 0)
    return table.concat(parts)
end

local function read(text, position, depth)
    local tag = text:sub(position, position)
    if tag == "s" then
        local length, start = text:match("^(%d+):()", position + 1)
        local finish = start and start + tonumber(length) - 1
        if finish == nil or finish > #text then
            error("bad string", 0)
        end
        return text:sub(start, finish), finish + 1
    elseif tag == "n" then
        local digits, after = text:match("^([^;]+);()", position + 1)
        local number = tonumber(digits)
        if number == nil then
            error("bad number", 0)
        end
        return number, after
    elseif tag == "T" or tag == "F" then
        return tag == "T", position + 1
    elseif tag == "t" and depth < MAX_DEPTH then
        local result = {}
        position = position + 1
        while text:sub(position, position) ~= "e" do
            if position > #text then
                error("unfinished table", 0)
            end
            local key, field
            key, position = read(text, position, depth + 1)
            field, position = read(text, position, depth + 1)
            result[key] = field
        end
        return result, position + 1
    end
    error("bad data", 0)
end

--- The value written in the text, or nil and the reason when the text is not VXV data.
function Serializer.Decode(text)
    local ok, value, after = pcall(read, text, 1, 0)
    if not ok then
        return nil, value
    end
    if after ~= #text + 1 then
        return nil, "trailing data"
    end
    return value
end
