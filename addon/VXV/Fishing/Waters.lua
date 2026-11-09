local ns = select(2, ...).Fishing

--- The waters too hard for a fishing level (owner's request of 8 November). The game tells no water's level before a
--- cast; it refuses the cast of a character whose fishing is too low (« Niveau de la technique insuffisant », measured
--- on 8 November), or one that lands out of the water. Each refusal for the level teaches the zone's need, kept for
--- every character of the account: a session no longer starts there below it.
local Waters = {}
ns.Waters = Waters

local Compat = VXV.Compat

-- The game's texts of a cast refused, by kind: its fishing too low ("Requires Fishing %d" tells the level needed),
-- or the line out of fishable water. Looked up in the client's globals, not measured on WoW Forever.
local TOO_LOW = { "SPELL_FAILED_LOW_CASTLEVEL", "SPELL_FAILED_FISHING_TOO_LOW" }
local OUT_OF_WATER = { "SPELL_FAILED_NOT_FISHABLE", "SPELL_FAILED_TOO_SHALLOW" }

local saved = {}

--- Takes the module's saved data: the level each zone needs, as learned.
function Waters.Load(data)
    saved = data
    saved.waters = type(saved.waters) == "table" and saved.waters or {}
end

--- The zone the player is in: its map's id and name (C_Map), else its name; nil when the client tells neither.
--- C_Map and GetRealZoneText are not measured on WoW Forever: looked up, never called when absent.
function Waters.Zone()
    local mapOf, infoOf = Compat.Resolve("C_Map.GetBestMapForUnit"), Compat.Resolve("C_Map.GetMapInfo")
    if type(mapOf) == "function" and type(infoOf) == "function" then
        local ok, mapId = pcall(mapOf, "player")
        local known, info = pcall(infoOf, mapId)
        if ok and known and type(mapId) == "number" and type(info) == "table" and type(info.name) == "string" then
            return "map:" .. mapId, info.name
        end
    end
    local zoneText = Compat.Resolve("GetRealZoneText")
    if type(zoneText) == "function" then
        local ok, name = pcall(zoneText)
        if ok and type(name) == "string" and name ~= "" and not VXV.IsSecret(name) then
            return "zone:" .. name, name
        end
    end
end

--- The level the zone needs, as learned, and its name; nil when nothing was learned there.
function Waters.Need()
    local key, name = Waters.Zone()
    if key ~= nil and saved.waters[key] ~= nil then
        return saved.waters[key], name
    end
end

--- Whether a text is one of the globals', or matches a global's pattern ("Requires Fishing %d"): true, and the number.
local function matches(text, globals)
    for _, name in ipairs(globals) do
        local wording = Compat.Resolve(name)
        if type(wording) == "string" then
            if wording == text then
                return true
            end
            local escaped = wording:gsub("[%(%)%.%+%-%*%?%[%]%^%$]", "%%%0")
            local pattern = "^" .. escaped:gsub("%%d", "(%%d+)") .. "$"
            local number = text:match(pattern)
            if number ~= nil then
                return true, tonumber(number)
            end
        end
    end
    return false
end

--- What a refused cast's text says: "low" (and the level needed when the game tells it), "far", or nil.
function Waters.Refusal(text)
    if type(text) ~= "string" or VXV.IsSecret(text) then
        return nil
    end
    local low, need = matches(text, TOO_LOW)
    if low then
        return "low", need
    end
    if matches(text, OUT_OF_WATER) then
        return "far"
    end
end

--- Learns that the zone needs more than this level (or exactly need, when the game told it); nothing without either.
function Waters.Learn(level, need)
    local key = Waters.Zone()
    if key ~= nil and (level ~= nil or need ~= nil) then
        saved.waters[key] = math.max(saved.waters[key] or 0, need or level + 1)
    end
end
