local _, ns = ...

--- The Taverne tab (§7.0): the tavern's scene, a plaque per place opening its tab (hovering a place, only its
--- plaque changes), then who is connected with VXV.
local Bus, Presence, Theme, Tokens, Window = ns.Bus, ns.Presence, ns.Theme, ns.Tokens, ns.Window

local PERCENT = 100
local PLAQUE_HEIGHT = 28
local PLAQUE_PADDING = 24
local PLAQUE_RINGS = { { "wood-shade", 3 }, { "copper", 3 } }
local GAP = 12

local onlineText

--- Where the plaque sits on its place's zone (§4.2), as an anchor and an offset in the zone's height.
local PLAQUE_ANCHORS = {
    above = function(plaque, spot)
        plaque:SetPoint("BOTTOM", spot, "TOP", 0, 8)
    end,
    board = function(plaque, spot)
        plaque:SetPoint("BOTTOM", spot, "TOP", 0, -10)
    end,
    middle = function(plaque, spot)
        plaque:SetPoint("TOP", spot, "TOP", 0, -spot:GetHeight() * 0.36)
    end,
    table = function(plaque, spot)
        plaque:SetPoint("TOP", spot, "TOP", 0, -spot:GetHeight() * 0.8)
    end,
    door = function(plaque, spot)
        plaque:SetPoint("BOTTOM", spot, "BOTTOM", 0, spot:GetHeight() * 0.66)
    end,
}

local function addPlace(scene, place, width, height)
    local left, top, spotWidth, spotHeight = unpack(place.spot)
    local spot = CreateFrame("Button", nil, scene)
    spot:SetSize(width * spotWidth / PERCENT, height * spotHeight / PERCENT)
    spot:SetPoint("TOPLEFT", width * left / PERCENT, -height * top / PERCENT)
    local plaque = CreateFrame("Frame", nil, spot)
    local background = Theme.Fill(plaque, "wood")
    background:SetAllPoints()
    Theme.Rings(plaque, PLAQUE_RINGS)
    local label = Theme.Text(plaque, "pixel", 14, "parchment")
    label:SetPoint("CENTER")
    label:SetText(place.name)
    plaque:SetSize(label:GetStringWidth() + PLAQUE_PADDING, PLAQUE_HEIGHT)
    PLAQUE_ANCHORS[place.plaque](plaque, spot)
    spot.plaque = plaque
    spot:SetScript("OnEnter", function()
        background:SetColorTexture(Theme.Color("plum"))
    end)
    spot:SetScript("OnLeave", function()
        background:SetColorTexture(Theme.Color("wood"))
    end)
    spot:SetScript("OnClick", function()
        Window.Select(place.id)
    end)
end

local function showOnline()
    local names = Presence.Online()
    onlineText:SetText(string.format("VXV %s · Connectés avec VXV (%d) : %s", ns.VERSION, #names,
        table.concat(names, ", ")))
end

Bus.On("presence.changed", function()
    if onlineText ~= nil then
        showOnline()
    end
end)

ns.Modules.Register({
    id = "home",
    name = "Taverne",
    tab = {
        place = "tavern",
        Build = function(content)
            local width = content:GetWidth()
            local height = width * Tokens.tavern.height / Tokens.tavern.width
            local scene = CreateFrame("Frame", nil, content)
            scene:SetPoint("TOPLEFT")
            scene:SetSize(width, height)
            local picture = scene:CreateTexture(nil, "BACKGROUND")
            picture:SetAllPoints()
            picture:SetTexture(Theme.MEDIA .. "taverne.png", nil, nil, "NEAREST")
            for _, place in ipairs(Tokens.places) do
                addPlace(scene, place, width, height)
            end
            onlineText = Theme.Text(content, "text", 14, "lavender")
            onlineText:SetPoint("TOPLEFT", scene, "BOTTOMLEFT", GAP * 2, -GAP * 2)
            onlineText:SetWidth(width - GAP * 4)
            showOnline()
            local footer = Theme.Text(content, "text", 13, "muted")
            footer:SetPoint("BOTTOMLEFT", GAP * 2, GAP)
            footer:SetText("Survole un lieu pour l'éclairer · clique pour entrer")
        end,
    },
})
