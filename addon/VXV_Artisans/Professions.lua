local _, ns = ...

--- The player's professions as the game tells them (phase 0, T10): each profession's level at each login, and its
--- learned recipes when the player opens its window; for every character of the account. A change goes to the
--- website through the companion and to the guild ("artisans.own").
local Professions = {}
ns.Professions = Professions

local Directory, Website = ns.Directory, ns.Website

local Compat = VXV.Compat

-- GetProfessions returns five slots, nil when empty: two main professions, archaeology, fishing, cooking.
local PROFESSION_SLOTS = 5
-- A profession window's recipes are ready a moment after it opens (measured on 3 October).
local READ_DELAY_SECONDS = 1

local function classToken()
    local _, token = UnitClass("player")
    return not VXV.IsSecret(token) and type(token) == "string" and token or nil
end

--- Each profession of the player's character, by id: its level as the list of professions tells it now.
local function readLevels()
    local character, slots = VXV.PlayerName(), { Compat.GetProfessions() }
    local levels = {}
    if character == nil or not slots[1] then
        return levels
    end
    for slot = 1, PROFESSION_SLOTS do
        local index = slots[slot + 1]
        local ok, name, _, level, max, _, _, id
        if index ~= nil then
            ok, name, _, level, max, _, _, id = Compat.GetProfessionInfo(index)
        end
        if ok and type(id) == "number" and type(name) == "string" and type(level) == "number"
            and type(max) == "number" then
            levels[id] = { character = character, class = classToken(), id = id, name = name, level = level, max = max,
                readAt = time() }
        end
    end
    return levels
end

--- Keeps the player's changed professions, for the companion and the guild.
local function keep(entries)
    for _, entry in ipairs(entries) do
        Directory.SetOwn(entry)
        VXV.Emit("artisans.own", entry)
    end
    local character = VXV.PlayerName()
    if #entries > 0 and character ~= nil then
        Website.Send(character)
    end
end

local function sameRecipes(left, right)
    for id in pairs(left or {}) do
        if (right or {})[id] == nil then
            return false
        end
    end
    for id in pairs(right or {}) do
        if (left or {})[id] == nil then
            return false
        end
    end
    return true
end

--- The learned recipes of the profession whose window is open: only one of the player's own, at the level the list
--- tells (a profession another player links opens the same window).
local function readRecipes()
    local levels = readLevels()
    local okBase, base = Compat.GetBaseProfessionInfo()
    local ok, ids = Compat.GetAllRecipeIDs()
    local entry = okBase and type(base) == "table" and levels[base.professionID]
    if not entry or base.skillLevel ~= entry.level or not ok or type(ids) ~= "table" then
        return
    end
    local recipes = {}
    for _, id in ipairs(ids) do
        local okInfo, info = Compat.GetRecipeInfo(id)
        if okInfo and type(info) == "table" and info.learned and not VXV.IsSecret(info.name)
            and type(info.name) == "string" then
            recipes[id] = info.name
        end
    end
    local known = Directory.Own(entry.character, entry.id)
    if known ~= nil and known.level == entry.level and sameRecipes(known.recipes, recipes) then
        return
    end
    entry.recipes, entry.recipesAt = recipes, time()
    keep({ entry })
end

--- Reads the levels at login (keeping the recipes known), then the recipes at each opening of a profession's window.
function Professions.Start()
    local changed = {}
    for _, entry in pairs(readLevels()) do
        local known = Directory.Own(entry.character, entry.id)
        if known == nil or known.level ~= entry.level or known.max ~= entry.max then
            entry.recipes, entry.recipesAt = known and known.recipes, known and known.recipesAt
            changed[#changed + 1] = entry
        end
    end
    keep(changed)
    VXV.OnEvent("TRADE_SKILL_SHOW", function()
        C_Timer.After(READ_DELAY_SECONDS, readRecipes)
    end)
end
