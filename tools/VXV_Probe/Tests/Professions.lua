local _, ns = ...

--- T10: the player's professions and known recipes (artisans directory, P14).
--- The modern API is tried first, then the classic one. Recipes are read when a profession window opens.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("professions")

-- GetProfessions returns five slots, nil when empty: two main professions, archaeology, fishing, cooking.
local PROFESSION_SLOTS = 5
local PRINTED_RECIPES = 5
local READ_DELAY_SECONDS = 1
local HEADER_KINDS = { header = true, subheader = true }

local function listModernProfessions()
    local results = { Compat.GetProfessions() }
    if not results[1] then
        return false
    end
    local count = 0
    for slot = 1, PROFESSION_SLOTS do
        local index = results[slot + 1]
        if index then
            local _, name, _, rank, maxRank, _, _, skillLine = Compat.GetProfessionInfo(index)
            count = count + 1
            log.Ok("métier", name, "niveau", rank, "/", maxRank, "ligne de compétence", skillLine)
        end
    end
    log.Info("GetProfessions :", count, "métier(s)")
    return true
end

local function listClassicSkills()
    local ok, count = Compat.GetNumSkillLines()
    if not ok then
        return false
    end
    for index = 1, tonumber(count) or 0 do
        local _, name, isHeader, _, rank, _, _, maxRank = Compat.GetSkillLineInfo(index)
        log.Info(isHeader and "catégorie" or "compétence", name, isHeader and "" or Util.Join(rank, "/", maxRank))
    end
    return true
end

local function listProfessions()
    if not listModernProfessions() and not listClassicSkills() then
        log.Fail("ni GetProfessions ni GetNumSkillLines : métiers illisibles")
    end
end

local function reportRecipes(api, profession, recipes, total)
    log.Ok(api, ": métier", profession, ":", #recipes, "recette(s) connue(s) sur", total)
    for index, recipe in ipairs(recipes) do
        local logRecipe = index <= PRINTED_RECIPES and log.Info or log.Trace
        logRecipe("  recette", recipe)
    end
end

local function readModernRecipes()
    local ok, recipeIds = Compat.GetAllRecipeIDs()
    if not ok or type(recipeIds) ~= "table" then
        return false
    end
    local recipes = {}
    for _, recipeId in ipairs(recipeIds) do
        local _, info = Compat.GetRecipeInfo(recipeId)
        if type(info) == "table" and info.learned then
            recipes[#recipes + 1] = recipeId .. " " .. Util.Safe(info.name)
        end
    end
    reportRecipes("C_TradeSkillUI", select(2, Compat.GetBaseProfessionInfo()), recipes, #recipeIds)
    return true
end

local function readClassicRecipes()
    local ok, count = Compat.GetNumTradeSkills()
    if not ok then
        return false
    end
    local recipes = {}
    for index = 1, tonumber(count) or 0 do
        local _, name, kind = Compat.GetTradeSkillInfo(index)
        if not HEADER_KINDS[kind] then
            recipes[#recipes + 1] = Util.Safe(name)
        end
    end
    local _, lineName, rank, maxRank = Compat.GetTradeSkillLine()
    reportRecipes("GetTradeSkillInfo", Util.Join(lineName, rank, "/", maxRank), recipes, count)
    return true
end

local function readRecipes()
    if not readModernRecipes() and not readClassicRecipes() then
        log.Fail("aucune API de recettes lisible")
    end
end

ns.Registry.Register({
    id = "professions",
    description = "métiers et recettes connues (lecture à l'ouverture d'une fenêtre de métier)",
    Setup = function()
        log.Listen("TRADE_SKILL_SHOW", function()
            C_Timer.After(READ_DELAY_SECONDS, readRecipes)
        end)
    end,
    commands = {
        { name = "list", run = listProfessions },
        { name = "recipes", run = readRecipes },
    },
})
