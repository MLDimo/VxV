local ns = select(2, ...).Artisans

--- What the Artisans screen shows, as rows for the core's lists: the recipes found with who knows them, and the
--- player's own professions.
local ArtisansView = {}
ns.ArtisansView = ArtisansView

local Directory, Text = ns.Directory, ns.Text

local Theme = VXV.Theme

local DATE = "%d/%m"
local MIN_SEARCH = 2
local ASK = "Tape le nom d'un objet : qui peut le fabriquer dans la guilde ?"
local NOTHING = "Aucune recette connue de la guilde ne correspond."
local NO_PROFESSION = "Aucun métier relevé : ils le sont à la connexion, sur chaque personnage."
local NO_RECIPE = "ouvre la fenêtre du métier pour relever ses recettes"

local row = VXV.RowList.Row

local function recipesCount(entry)
    local count = 0
    for _ in pairs(entry.recipes or {}) do
        count = count + 1
    end
    return count
end

--- « Thom Leboss · Secourisme 22/75 · 10/12 ».
local function crafter(entry)
    return ("%s · %s %d/%d · %s"):format(VXV.ClassColored(entry.character, entry.class), entry.name, entry.level,
        entry.max, date(DATE, entry.recipesAt or entry.readAt))
end

--- The recipes whose name holds the words searched, each with who knows it, the most skilled first.
function ArtisansView.Results(search)
    if #Text.Fold(search) < MIN_SEARCH then
        return { row("line", ASK) }
    end
    local rows = {}
    for _, recipe in ipairs(Directory.Search(search)) do
        rows[#rows + 1] = row("header", recipe.name)
        for _, entry in ipairs(recipe.crafters) do
            rows[#rows + 1] = row("line", crafter(entry))
        end
    end
    return #rows > 0 and rows or { row("line", NOTHING) }
end

--- The player's characters' professions, with their recipes' count or how to read them.
function ArtisansView.Mine()
    local rows, character = {}, nil
    for _, entry in ipairs(Directory.Mine()) do
        if entry.character ~= character then
            character = entry.character
            rows[#rows + 1] = row("header", VXV.ClassColored(character, entry.class))
        end
        local recipes = entry.recipesAt == nil and NO_RECIPE or VXV.Count(recipesCount(entry), "recette", "recettes")
        rows[#rows + 1] = row("line", ("%s %d/%d · %s"):format(entry.name, entry.level, entry.max, recipes))
    end
    return #rows > 0 and rows or { row("line", Theme.Colored(NO_PROFESSION, "muted")) }
end
