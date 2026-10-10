local ns = select(2, ...).Artisans

--- What the website gets of the professions (P14.2): a character's professions as VXV-METIERS-1
--- (packages/server/src/domain/artisans.ts), kept for the companion: the player's own, and for an officer those the
--- guild told.
local Website = {}
ns.Website = Website

local Directory, Text = ns.Directory, ns.Text

local HEADER = "VXV-METIERS-1"
local KIND = "metiers"

--- A character's professions as the website reads them.
function Website.Text(character)
    local entries = Directory.Of(character)
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

--- Keeps a character's professions for the companion, which takes them to the website.
function Website.Send(character)
    VXV.Emit("sync.put", KIND, character, Website.Text(character))
end
