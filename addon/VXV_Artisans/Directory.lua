local _, ns = ...

--- The guild's artisans as this addon knows them: the website's directory (VXV-ARTISANS, brought by the companion),
--- what the guild's addons told (Sharing.lua) and the player's own characters (Professions.lua). An entry is a
--- character's profession: { character, class, id, name, level, max, readAt, recipesAt, recipes = { [id] = name } };
--- for each, the latest level and the latest recipes win, whatever their source.
local Directory = {}
ns.Directory = Directory

local Text = ns.Text

local HEADER = "VXV-METIERS-1"
local SEARCH_RESULTS = 30
local UPDATED = "artisans.updated"

local saved = { own = {}, heard = {} }

local function keyOf(character, professionId)
    return character .. "|" .. professionId
end

-- The website's directory (contract VXV-ARTISANS-1, packages/server/src/domain/addonArtisans.ts). Not passed on by
-- the officers: too big for the guild channel, each member's addon tells its own professions instead.
local website = VXV.SiteData({
    name = "artisans",
    header = "VXV-ARTISANS-1",
    shared = false,
    New = function()
        return { entries = {}, recipes = {} }
    end,
    lines = {
        -- A;character;class token;profession id;name;level;max level;read;recipes read (0 while never read)
        A = { 8, function(data, f)
            local id, level, max = tonumber(f[3]), tonumber(f[5]), tonumber(f[6])
            local readAt, recipesAt = tonumber(f[7]), tonumber(f[8])
            if id == nil or level == nil or max == nil or readAt == nil or recipesAt == nil then
                return false
            end
            data.entries[keyOf(f[1], id)] = { character = f[1], class = f[2] ~= "" and f[2] or nil, id = id,
                name = f[4], level = level, max = max, readAt = readAt,
                recipesAt = recipesAt > 0 and recipesAt or nil, recipes = recipesAt > 0 and {} or nil }
            return true
        end },
        -- K;recipe id;profession id;name
        K = { 3, function(data, f)
            local id = tonumber(f[1])
            if id ~= nil then
                data.recipes[id] = f[3]
            end
            return id ~= nil
        end },
        -- R;character;profession id;recipe ids separated by ","
        R = { 3, function(data, f)
            local entry = data.entries[keyOf(f[1], tonumber(f[2]) or 0)]
            if entry == nil or entry.recipes == nil then
                return false
            end
            for id in f[3]:gmatch("%d+") do
                entry.recipes[tonumber(id)] = data.recipes[tonumber(id)]
            end
            return true
        end },
    },
})

--- Takes the module's saved data at start-up: the website's directory, and the professions heard and the own.
function Directory.Restore(data)
    data.own = type(data.own) == "table" and data.own or {}
    data.heard = type(data.heard) == "table" and data.heard or {}
    saved = data
    website.Restore(data)
end

--- Whether the candidate's level or recipes are newer than the entry's.
local function newer(candidate, entry)
    if entry == nil then
        return true
    end
    return candidate.readAt > entry.readAt
        or (candidate.recipesAt ~= nil and (entry.recipesAt == nil or candidate.recipesAt > entry.recipesAt))
end

--- The entry with the candidate's level and recipes where they are newer.
local function merge(entry, candidate)
    local result = {}
    for field, value in pairs(entry or candidate) do
        result[field] = value
    end
    if entry ~= nil and candidate.readAt > entry.readAt then
        result.name, result.level, result.max, result.readAt = candidate.name, candidate.level, candidate.max,
            candidate.readAt
    end
    if entry ~= nil and newer({ readAt = 0, recipesAt = candidate.recipesAt }, entry) then
        result.recipes, result.recipesAt = candidate.recipes, candidate.recipesAt
    end
    result.class = result.class or candidate.class
    return result
end

--- Every entry known, by key.
local function all()
    local entries = {}
    local site = website.Current()
    for _, source in ipairs({ site and site.entries or {}, saved.heard, saved.own }) do
        for key, entry in pairs(source) do
            entries[key] = merge(entries[key], entry)
        end
    end
    return entries
end

local function sorted(entries)
    local list = {}
    for _, entry in pairs(entries) do
        list[#list + 1] = entry
    end
    table.sort(list, function(left, right)
        if left.name ~= right.name then
            return left.name < right.name
        end
        if left.level ~= right.level then
            return left.level > right.level
        end
        return left.character < right.character
    end)
    return list
end

--- Every character's profession, by profession then level.
function Directory.Entries()
    return sorted(all())
end

--- The player's own characters' professions, by profession then level.
function Directory.Mine()
    return sorted(saved.own)
end

--- An own character's profession, or nil.
function Directory.Own(character, professionId)
    return saved.own[keyOf(tostring(character), tonumber(professionId) or 0)]
end

--- Keeps a profession of the player's own character.
function Directory.SetOwn(entry)
    saved.own[keyOf(entry.character, entry.id)] = entry
    VXV.Emit(UPDATED)
end

--- Whether a level read at readAt or recipes read at recipesAt (0 for none) would tell this addon something new.
function Directory.IsNewer(character, professionId, readAt, recipesAt)
    if type(character) ~= "string" or type(professionId) ~= "number" or type(readAt) ~= "number" then
        return false
    end
    return newer({ readAt = readAt, recipesAt = (tonumber(recipesAt) or 0) > 0 and recipesAt or nil },
        all()[keyOf(character, professionId)])
end

--- A profession told by the guild: kept when it brings a newer level or newer recipes. Returns whether it did.
function Directory.Hear(entry)
    local key = keyOf(entry.character, entry.id)
    if not newer(entry, all()[key]) then
        return false
    end
    saved.heard[key] = merge(saved.heard[key], entry)
    VXV.Emit(UPDATED)
    return true
end

--- « Qui peut fabriquer… ? » (P14.3): the recipes whose name holds every word searched, with who knows them.
function Directory.Search(search)
    local found = {}
    for _, entry in pairs(all()) do
        for id, name in pairs(entry.recipes or {}) do
            if Text.Matches(search, name) then
                found[id] = found[id] or { id = id, name = name, crafters = {} }
                table.insert(found[id].crafters, entry)
            end
        end
    end
    local list = {}
    for _, recipe in pairs(found) do
        table.sort(recipe.crafters, function(left, right)
            return left.level > right.level
        end)
        list[#list + 1] = recipe
    end
    table.sort(list, function(left, right)
        return left.name < right.name
    end)
    for index = #list, SEARCH_RESULTS + 1, -1 do
        list[index] = nil
    end
    return list
end

--- A character's professions as the website reads them (VXV-METIERS-1, packages/server/src/domain/artisans.ts).
function Directory.Text(character)
    local entries = {}
    for _, entry in pairs(all()) do
        if entry.character == character then
            entries[#entries + 1] = entry
        end
    end
    table.sort(entries, function(left, right)
        return left.id < right.id
    end)
    local lines = { HEADER, "C;" .. character }
    for _, entry in ipairs(entries) do
        lines[#lines + 1] = table.concat({ "P", entry.id, Text.Field(entry.name), entry.level, entry.max, entry.readAt,
            entry.recipesAt or 0 }, ";")
    end
    for _, entry in ipairs(entries) do
        local ids = {}
        for id in pairs(entry.recipes or {}) do
            ids[#ids + 1] = id
        end
        table.sort(ids)
        for _, id in ipairs(ids) do
            lines[#lines + 1] = table.concat({ "R", entry.id, id, Text.Field(entry.recipes[id]) }, ";")
        end
    end
    return table.concat(lines, "\n")
end

--- True when the character named "Prénom Nom" belongs to an officer, according to the website's directory.
Directory.IsOfficer = website.IsOfficer
