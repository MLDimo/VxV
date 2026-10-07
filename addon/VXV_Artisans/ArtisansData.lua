local _, ns = ...

--- The website's directory of the guild's artisans (contract VXV-ARTISANS-1,
--- packages/server/src/domain/addonArtisans.ts): each character's professions and the recipes they know. Brought by
--- the companion only: too big for the guild channel, each member's addon tells its own professions instead.
local function keyOf(character, professionId)
    return character .. "|" .. professionId
end

local ArtisansData = VXV.SiteData({
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
ns.ArtisansData = ArtisansData

--- The key of a character's profession, as the directory's entries are kept.
ArtisansData.Key = keyOf
