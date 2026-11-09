local _, ns = ...

--- T13 (9 November): a member's profession seen as the game shows a linked one (owner's request). Measures whether
--- the client gives the link of the profession whose window is open, how long it is (the guild's messages hold 255
--- bytes), and whether the game opens it again later, from another character while its owner is offline: by the
--- function a click on a chat link calls (SetItemRef), and by a click on the link written in the chat frame. Measured:
--- it opens only while its owner is online. So the addon draws its own window for an offline member: "recettes" keeps
--- some recipes of the open window, "details" reads what the game tells of each one, any window closed (icon,
--- category, crafted item, reagents).
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("lien")

local READ_DELAY_SECONDS = 1
-- The longest text an addon message carries (measured on 3 October).
local MESSAGE_BYTES = 255

-- The recipes "recettes" keeps from the open window.
local KEPT_RECIPES = 5

local db = {}

--- The link's inner part ("trade:…"), which SetItemRef takes, from the whole hyperlink.
local function inner(link)
    return link:match("|H(.-)|h")
end

--- A link readable in the journal: the escape characters shown, not interpreted.
local function printable(link)
    return (link:gsub("|", "||"))
end

--- Whether the open window is a linked profession, and whose, as the client tells it.
local function logLinked(when)
    local ok, linked, player = Compat.IsTradeSkillLinked()
    log.Call(when .. " : IsTradeSkillLinked", ok, not ok and linked or nil)
    if ok then
        log.Info(when, ": fenêtre liée", tostring(linked), "à", Util.Safe(player))
    end
    local okBase, base = Compat.GetBaseProfessionInfo()
    if okBase and type(base) == "table" then
        log.Info(when, ": métier", Util.Safe(base.professionName), base.professionID, "niveau", base.skillLevel)
    end
    local okIds, ids = Compat.GetAllRecipeIDs()
    local learned = 0
    for _, id in ipairs(okIds and type(ids) == "table" and ids or {}) do
        local okInfo, info = Compat.GetRecipeInfo(id)
        if okInfo and type(info) == "table" and info.learned then
            learned = learned + 1
        end
    end
    log.Info(when, ":", learned, "recette(s) apprise(s) affichée(s)")
end

--- Reads the link of the profession whose window is open, and keeps it with its owner (one per character and name).
local function readLink()
    logLinked("fenêtre ouverte")
    local ok, link = Compat.GetTradeSkillListLink()
    log.Call("GetTradeSkillListLink", ok, not ok and link or nil)
    if not ok or type(link) ~= "string" or Util.IsSecret(link) then
        log.Fail("pas de lien pour cette fenêtre :", Util.Safe(link))
        return
    end
    log.Check(#link <= MESSAGE_BYTES, "lien de", #link, "octets (un message entre addons en porte", MESSAGE_BYTES,
        ")")
    log.Info("lien :", printable(link))
    local okBase, base = Compat.GetBaseProfessionInfo()
    local profession = okBase and type(base) == "table" and Util.Safe(base.professionName) or "?"
    local owner = Util.Safe(GetUnitName("player", true))
    local key = owner .. " · " .. profession
    if not db.links[key] then
        db.order[#db.order + 1] = key
    end
    db.links[key] = link
    log.Ok("lien gardé :", key, "(", #db.order, "lien(s) en tout)")
end

local function list()
    if #db.order == 0 then
        log.Info("aucun lien gardé : ouvre la fenêtre d'un de tes métiers")
    end
    for index, key in ipairs(db.order) do
        log.Info(index, key, #db.links[key], "octets")
    end
end

local function chosen(args)
    local index = tonumber((Util.SplitFirst(args or ""))) or #db.order
    local key = db.order[index]
    if key == nil then
        log.Fail("aucun lien n°", index, ": /vxvtest lien liste")
    end
    return key, key and db.links[key]
end

--- Opens a kept link as a click on it in the chat would.
local function open(args)
    local key, link = chosen(args)
    if link == nil then
        return
    end
    log.Info("ouverture de", key, "par SetItemRef")
    log.Call("SetItemRef", Compat.SetItemRef(inner(link), link, "LeftButton"))
    C_Timer.After(READ_DELAY_SECONDS, function()
        logLinked("après SetItemRef")
    end)
end

--- Writes a kept link in the chat frame, for the player to click.
local function chat(args)
    local key, link = chosen(args)
    if link ~= nil then
        DEFAULT_CHAT_FRAME:AddMessage("VXV Probe, clique : " .. link .. " (" .. key .. ")")
        log.Info("lien écrit dans le chat :", key)
    end
end

--- Keeps a few learned recipes of the open window, for "details" to read with every window closed.
local function keepRecipes()
    local ok, ids = Compat.GetAllRecipeIDs()
    db.recipes = {}
    for _, id in ipairs(ok and type(ids) == "table" and ids or {}) do
        local okInfo, info = Compat.GetRecipeInfo(id)
        if okInfo and type(info) == "table" and info.learned and #db.recipes < KEPT_RECIPES then
            db.recipes[#db.recipes + 1] = id
        end
    end
    log.Check(#db.recipes > 0, #db.recipes, "recette(s) gardée(s) :", table.concat(db.recipes, " "))
end

local function itemName(itemId)
    local ok, name = Compat.GetItemInfo(itemId)
    return ok and Util.Safe(name) or "?"
end

--- The reagents of a recipe's schematic: « 2 × Cuir léger (2318) ».
local function reagents(schematic)
    local parts = {}
    for _, slot in ipairs(type(schematic.reagentSlotSchematics) == "table" and schematic.reagentSlotSchematics or {}) do
        local reagent = type(slot.reagents) == "table" and slot.reagents[1] or {}
        parts[#parts + 1] = Util.Join(slot.quantityRequired, "×", itemName(reagent.itemID), "(" ..
            Util.Safe(reagent.itemID) .. ")", "type", Util.Safe(slot.reagentType))
    end
    return #parts > 0 and table.concat(parts, ", ") or "aucun"
end

--- What the game tells of one recipe, its profession's window closed.
local function detail(id)
    local okInfo, info = Compat.GetRecipeInfo(id)
    log.Call("GetRecipeInfo(" .. id .. ")", okInfo, not okInfo and info or nil)
    if okInfo and type(info) == "table" then
        log.Info(id, "info :", Util.Safe(info.name), "icône", Util.Safe(info.icon), "catégorie",
            Util.Safe(info.categoryID), "apprise", tostring(info.learned))
        local okCategory, category = Compat.GetCategoryInfo(info.categoryID)
        log.Info(id, "catégorie :", okCategory and type(category) == "table" and Util.Safe(category.name)
            or Util.Safe(category))
    else
        log.Info(id, "info :", Util.Safe(info))
    end
    local okSchematic, schematic = Compat.GetRecipeSchematic(id, false)
    log.Call("GetRecipeSchematic(" .. id .. ")", okSchematic, not okSchematic and schematic or nil)
    if okSchematic and type(schematic) == "table" then
        log.Info(id, "schéma :", Util.Safe(schematic.name), "objet", Util.Safe(schematic.outputItemID),
            itemName(schematic.outputItemID), "×", Util.Safe(schematic.quantityMin), "-",
            Util.Safe(schematic.quantityMax), "icône", Util.Safe(schematic.icon))
        log.Info(id, "composants :", reagents(schematic))
    end
    local okTexture, texture = Compat.GetSpellTexture(id)
    log.Info(id, "icône du sort :", okTexture and Util.Safe(texture) or "absente")
    local okLink, link = Compat.GetRecipeItemLink(id)
    log.Info(id, "lien de l'objet :", okLink and type(link) == "string" and (link:gsub("|", "||")) or "absent")
end

local function details()
    if #(db.recipes or {}) == 0 then
        log.Fail("aucune recette gardée : ouvre un métier puis /vxvtest lien recettes")
    end
    for _, id in ipairs(db.recipes or {}) do
        detail(id)
    end
end

ns.Registry.Register({
    id = "lien",
    description = "lien d'un métier : le lire à l'ouverture de sa fenêtre, le rouvrir plus tard (T13)",
    Setup = function(saved)
        saved.professionLinks = saved.professionLinks or { links = {}, order = {} }
        db = saved.professionLinks
        log.Listen("TRADE_SKILL_SHOW", function()
            C_Timer.After(READ_DELAY_SECONDS, function()
                local ok, linked = Compat.IsTradeSkillLinked()
                if not (ok and linked) then
                    readLink()
                end
            end)
        end)
    end,
    commands = {
        { name = "lire", run = readLink },
        { name = "liste", run = list },
        { name = "ouvrir", usage = "[n]", run = open },
        { name = "chat", usage = "[n]", run = chat },
        { name = "recettes", run = keepRecipes },
        { name = "details", run = details },
    },
})
