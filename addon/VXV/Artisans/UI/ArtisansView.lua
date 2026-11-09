local ns = select(2, ...).Artisans

--- What the Artisans screen shows, as rows for the core's lists: the professions and the recipes found with who knows
--- them (a click on a crafter opens their profession, Links.lua), and the player's own professions.
local ArtisansView = {}
ns.ArtisansView = ArtisansView

local Directory, Links, Text = ns.Directory, ns.Links, ns.Text

local Theme = VXV.Theme

local DATE = "%d/%m"
local MIN_SEARCH = 2
local ASK = "Tape le nom d'un objet ou d'un métier : qui peut le fabriquer dans la guilde ?"
local NOTHING = "Aucun métier ni aucune recette connue de la guilde ne correspond."
local OPENS = "Clic : ouvrir son métier comme un lien du chat."
local CLOSED = "Clic : ouvrir son métier, quand il est connecté."
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

--- « Thom Leboss · Secourisme 22/75 · 10/12 · en ligne », a click opening their profession.
local function crafter(entry)
    local opens = Links.Opens(entry)
    local text = ("%s · %s %d/%d · %s"):format(VXV.ClassColored(entry.character, entry.class), entry.name,
        entry.level, entry.max, date(DATE, entry.recipesAt or entry.readAt))
    return row("line", opens and (text .. " · " .. Theme.Colored("en ligne", "gain")) or text, {
        onClick = function()
            Links.Open(entry)
        end,
        tooltip = { title = entry.character, lines = { opens and OPENS or CLOSED } },
    })
end

--- The professions, then the recipes, whose name holds the words searched, each with who knows it, the most skilled
--- first.
function ArtisansView.Results(search)
    if #Text.Fold(search) < MIN_SEARCH then
        return { row("line", ASK) }
    end
    local rows = {}
    for _, profession in ipairs(Directory.Professions(search)) do
        rows[#rows + 1] = row("header", "Métier : " .. profession.name)
        for _, entry in ipairs(profession.crafters) do
            rows[#rows + 1] = crafter(entry)
        end
    end
    for _, recipe in ipairs(Directory.Search(search)) do
        rows[#rows + 1] = row("header", recipe.name)
        for _, entry in ipairs(recipe.crafters) do
            rows[#rows + 1] = crafter(entry)
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
