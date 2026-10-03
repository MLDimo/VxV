local _, ns = ...

--- T9: showing a guild title in the game: player tooltips, guild chat and guild roster (titles come in P13).
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("display")

local TEST_TITLE = "[Titre VXV]"
local COMMUNITIES_ADDON = "Blizzard_Communities"
local GUILD_UI_FRAMES = { "CommunitiesFrame", "GuildFrame", "GuildRosterFrame" }
local GUILD_UI_ADDONS = { COMMUNITIES_ADDON, "Blizzard_GuildUI" }

local installed = false
local reported = {}

--- Hooks run at every tooltip or message: only the first success of each display is journaled.
local function reportOnce(display, ...)
    if not reported[display] then
        reported[display] = true
        log.Ok(display .. " :", ...)
    end
end

local function decorateTooltip(tooltip)
    if type(tooltip.GetUnit) ~= "function" then
        return
    end
    local _, unit = tooltip:GetUnit()
    if Util.IsSecret(unit) or not unit then
        return
    end
    local isPlayer = UnitIsPlayer(unit)
    if Util.IsSecret(isPlayer) or not isPlayer then
        return
    end
    tooltip:AddLine(TEST_TITLE)
    reportOnce("infobulle", "titre ajouté pour", (select(2, Compat.GetUnitName(unit, true))))
end

local function hookTooltip()
    local unitType = Enum.TooltipDataType and Enum.TooltipDataType.Unit
    if Compat.AddTooltipPostCall(unitType, decorateTooltip) then
        log.Ok("infobulle : TooltipDataProcessor accroché")
        return
    end
    log.Call("infobulle : GameTooltip OnTooltipSetUnit",
        pcall(GameTooltip.HookScript, GameTooltip, "OnTooltipSetUnit", decorateTooltip))
end

local function decorateGuildMessage(_, _, text, ...)
    if Util.IsSecret(text) then
        return false
    end
    reportOnce("canal de guilde", "message préfixé par", TEST_TITLE)
    return false, TEST_TITLE .. " " .. text, ...
end

local function describeGuildUi()
    for _, frameName in ipairs(GUILD_UI_FRAMES) do
        log.Info("fenêtre", frameName, _G[frameName] and "présente" or "absente")
    end
    for _, addonName in ipairs(GUILD_UI_ADDONS) do
        log.Info("addon", addonName, "chargé :", (select(2, Compat.IsAddOnLoaded(addonName))))
    end
end

local function decorateRosterEntry(entry)
    local nameText = entry.NameFrame and entry.NameFrame.Name
    local text = nameText and nameText:GetText()
    if Util.IsSecret(text) or type(text) ~= "string" then
        return
    end
    nameText:SetText(text .. " " .. TEST_TITLE)
    reportOnce("liste de guilde", "titre ajouté à", text)
end

local function hookRoster()
    local mixin = CommunitiesMemberListEntryMixin
    if type(mixin) ~= "table" or type(mixin.SetMember) ~= "function" then
        log.Fail("liste de guilde : CommunitiesMemberListEntryMixin.SetMember absente")
        return
    end
    log.Call("liste de guilde : accroche de CommunitiesMemberListEntryMixin.SetMember",
        pcall(hooksecurefunc, mixin, "SetMember", decorateRosterEntry))
end

--- The guild window is loaded on demand: its rows copy the hook only if it is set before they are created.
local function hookRosterWhenLoaded()
    local _, loaded = Compat.IsAddOnLoaded(COMMUNITIES_ADDON)
    if loaded then
        hookRoster()
        return
    end
    log.Info("liste de guilde : accroche à la première ouverture de la fenêtre de guilde")
    log.Listen("ADDON_LOADED", function(addonName)
        if addonName == COMMUNITIES_ADDON then
            hookRoster()
        end
    end)
end

local function enable()
    if installed then
        log.Info("affichage de test déjà actif : taper /reload pour le retirer")
        return
    end
    installed = true
    hookTooltip()
    log.Call("canal de guilde : filtre des messages",
        Compat.AddMessageEventFilter("CHAT_MSG_GUILD", decorateGuildMessage))
    describeGuildUi()
    hookRosterWhenLoaded()
end

ns.Registry.Register({
    id = "display",
    description = "titre de test dans les infobulles, le canal de guilde et la liste de guilde",
    commands = {
        { name = "on", run = enable },
    },
})
