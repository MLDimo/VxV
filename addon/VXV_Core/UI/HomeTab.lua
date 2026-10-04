local _, ns = ...

--- The first tab of the window: what VXV is, and its version.
local LINE_GAP = 8

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
        end,
    },
})
