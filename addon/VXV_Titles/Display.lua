local _, ns = ...

--- The titles where the guild meets in game (P13.4, measured in phase 0, T9): a line in a player's tooltip, before
--- their messages in the guild channel, after their name in the guild list. Seen by the players with VXV only.
local Titles = ns.Titles

local Compat = VXV.Compat

local GUILD_WINDOW = "Blizzard_Communities"
local GUILD_LIST = "CommunitiesFrame.MemberList.ScrollBox"

local function decorateTooltip(tooltip)
    if type(tooltip) ~= "table" or type(tooltip.GetUnit) ~= "function" then
        return
    end
    local _, unit = tooltip:GetUnit()
    if VXV.IsSecret(unit) or type(unit) ~= "string" then
        return
    end
    for _, title in ipairs(Titles.Of(VXV.NameOfUnit(unit))) do
        tooltip:AddLine(Titles.Label(title))
    end
end

--- The guild channel's filter: the message goes on, after its author's titles.
local function decorateGuildMessage(_, _, text, author, ...)
    if VXV.IsSecret(text) or type(text) ~= "string" then
        return false
    end
    local tag = Titles.Tag(author)
    if tag == nil then
        return false
    end
    return false, tag .. " " .. text, author, ...
end

local function decorateGuildRow(row)
    local name = type(row) == "table" and type(row.NameFrame) == "table" and row.NameFrame.Name
    local text = type(name) == "table" and name:GetText()
    if VXV.IsSecret(text) or type(text) ~= "string" then
        return
    end
    local tag = Titles.Tag(text)
    if tag ~= nil then
        name:SetText(text .. " " .. tag)
    end
end

--- The guild list's rows, decorated each time the list fills one; those already made come as (row) alone, the new
--- ones as (owner, row) (measured on 3 October). False while the guild window is not loaded.
local function hookGuildList()
    local scrollBox = Compat.Resolve(GUILD_LIST)
    if scrollBox == nil then
        return false
    end
    local owner = {}
    Compat.AddInitializedFrameCallback(scrollBox, function(first, second)
        decorateGuildRow(first == owner and second or first)
    end, owner, true)
    return true
end

local Display = {}
ns.Display = Display

-- Another bundle asks for a player's titles (the deathroll's window): ("Prénom Nom", reply(titles)).
VXV.On("titles.request", function(name, reply)
    if type(reply) == "function" then
        reply(Titles.Of(name))
    end
end)

--- Hooks the three displays once the module started.
function Display.Start()
    Compat.AddTooltipPostCall(Enum.TooltipDataType.Unit, decorateTooltip)
    Compat.AddMessageEventFilter("CHAT_MSG_GUILD", decorateGuildMessage)
    if not hookGuildList() then
        VXV.OnEvent("ADDON_LOADED", function(addonName)
            if addonName == GUILD_WINDOW then
                hookGuildList()
            end
        end)
    end
end
