local ns = select(2, ...).Artisans

--- The recipes' items in the game's tooltips (owner's request of 7 October): a recipe looted or in the bags says
--- whether a character of the guild already knows it, in green, or not, in red. The item's name ("Recette : Potion de
--- soins mineure") is matched with the names of the recipes the directory knows, accents and case aside; a recipe
--- counts as unknown until its artisan opened their profession's window with VXV.
local RecipeItems = {}
ns.RecipeItems = RecipeItems

local Directory, Text = ns.Directory, ns.Text
local Compat, Theme = VXV.Compat, VXV.Theme

-- The game's item class of the recipes, and its subclass of the books (they teach no recipe).
local RECIPE_CLASS, BOOK_SUBCLASS = 9, 0
-- Positions of the name, class and subclass among C_Item.GetItemInfo's results (after Compat's "ok").
local NAME_RESULT, CLASS_RESULT, SUBCLASS_RESULT = 2, 13, 14
-- What the recipe teaches follows its kind and a colon ("Recette : ", "Patron : ", "Formule : "…).
local TAUGHT = ":%s*(.-)%s*$"
local KNOWN = { text = "Recette possédée par VXV", color = "gain" }
local UNKNOWN = { text = "Recette non possédée par VXV", color = "loss" }

local knownNames

--- The folded names of the recipes the guild knows, built again after each change of the directory.
local function known()
    if knownNames == nil then
        knownNames = {}
        for _, name in pairs(Directory.Recipes()) do
            knownNames[Text.Fold(name)] = true
        end
    end
    return knownNames
end

VXV.On("artisans.updated", function()
    knownNames = nil
end)

--- Whether the guild knows the recipe an item teaches: true or false, nil for an item that is not a recipe (or not
--- in the client's cache yet).
function RecipeItems.Known(item)
    local results = { Compat.GetItemInfo(item) }
    local name = results[NAME_RESULT]
    if not results[1] or results[CLASS_RESULT] ~= RECIPE_CLASS or results[SUBCLASS_RESULT] == BOOK_SUBCLASS
        or VXV.IsSecret(name) or type(name) ~= "string" then
        return nil
    end
    local taught = name:match(TAUGHT)
    if taught == nil or taught == "" then
        return nil
    end
    return known()[Text.Fold(taught)] == true
end

local function decorateTooltip(tooltip, data)
    if type(tooltip) ~= "table" or type(data) ~= "table" or VXV.IsSecret(data.id) or type(data.id) ~= "number" then
        return
    end
    local isKnown = RecipeItems.Known(data.id)
    if isKnown ~= nil then
        local line = isKnown and KNOWN or UNKNOWN
        local red, green, blue = Theme.Color(line.color)
        tooltip:AddLine(line.text, red, green, blue)
    end
end

--- Hooks the items' tooltips once the module started.
function RecipeItems.Start()
    Compat.AddTooltipPostCall(Enum.TooltipDataType.Item, decorateTooltip)
end
