local _, ns = ...

--- T3: reading the /roll results in the system channel. T5: rolling from a button of the addon.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("rolls")

local ROLL_MIN, ROLL_MAX = 1, 100
local BUTTON_WIDTH, BUTTON_HEIGHT = 140, 32
local STRING_MARKER, NUMBER_MARKER = "\1", "\2"

local rollPattern
local button

--- Turns a Blizzard format string ("%s obtient %d (%d-%d).") into a Lua pattern capturing each value.
local function formatToPattern(format)
    local pattern = format:gsub("%%%d*%$?s", STRING_MARKER):gsub("%%%d*%$?d", NUMBER_MARKER)
    pattern = pattern:gsub("[%^%$%(%)%%%.%[%]%*%+%-%?]", "%%%0")
    pattern = pattern:gsub(STRING_MARKER, "(.+)"):gsub(NUMBER_MARKER, "(%%d+)")
    return "^" .. pattern .. "$"
end

local function onSystemMessage(text)
    if Util.IsSecret(text) then
        log.Trace("message système secret : un /roll éventuel est illisible")
        return
    end
    local roller, roll, low, high = text:match(rollPattern)
    if not roller then
        return
    end
    roll, low, high = tonumber(roll), tonumber(low), tonumber(high)
    log.Check(low <= roll and roll <= high, "roll lu : [" .. roller .. "]", roll, "(" .. low .. "-" .. high .. ")")
end

local function roll()
    log.Call("RandomRoll(" .. ROLL_MIN .. ", " .. ROLL_MAX .. ")", Compat.RandomRoll(ROLL_MIN, ROLL_MAX))
end

local function createButton()
    local created = CreateFrame("Button", nil, UIParent, "UIPanelButtonTemplate")
    created:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    created:SetPoint("CENTER")
    created:SetText("VXV roll " .. ROLL_MIN .. "-" .. ROLL_MAX)
    created:SetMovable(true)
    created:RegisterForDrag("LeftButton")
    created:SetScript("OnDragStart", created.StartMoving)
    created:SetScript("OnDragStop", created.StopMovingOrSizing)
    created:SetScript("OnClick", roll)
    created:Hide()
    return created
end

local function toggleButton()
    button = button or createButton()
    button:SetShown(not button:IsShown())
    log.Info(button:IsShown() and "bouton affiché au centre de l'écran (glisser pour le déplacer)"
        or "bouton caché")
end

ns.Registry.Register({
    id = "rolls",
    description = "lecture des /roll (écoute passive) et roll par un bouton",
    Setup = function()
        if type(RANDOM_ROLL_RESULT) ~= "string" then
            log.Fail("RANDOM_ROLL_RESULT absent : format des /roll inconnu")
            return
        end
        rollPattern = formatToPattern(RANDOM_ROLL_RESULT)
        log.Trace("format des /roll :", RANDOM_ROLL_RESULT)
        log.Listen("CHAT_MSG_SYSTEM", onSystemMessage)
    end,
    commands = {
        { name = "roll", run = roll },
        { name = "button", run = toggleButton },
    },
})
