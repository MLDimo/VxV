local _, ns = ...

--- The first tab of the window: what VXV is, its version, and who is connected with it.
local Bus, Presence = ns.Bus, ns.Presence

local LINE_GAP = 8

local onlineText

local function showOnline()
    local names = Presence.Online()
    onlineText:SetText(string.format("Connectés avec VXV (%d) : %s", #names, table.concat(names, ", ")))
end

Bus.On("presence.changed", function()
    if onlineText ~= nil then
        showOnline()
    end
end)

ns.Modules.Register({
    id = "home",
    name = "Accueil",
    tab = {
        title = "Accueil",
        Build = function(content)
            local title = content:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
            title:SetPoint("TOPLEFT")
            title:SetText("VXV " .. ns.VERSION)
            local intro = content:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
            intro:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -LINE_GAP)
            intro:SetJustifyH("LEFT")
            intro:SetText("Raids, soft reserves et loot de la guilde. Inscriptions et SR aussi sur le site et Discord.")
            onlineText = content:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
            onlineText:SetPoint("TOPLEFT", intro, "BOTTOMLEFT", 0, -LINE_GAP)
            onlineText:SetJustifyH("LEFT")
            showOnline()
        end,
    },
})
