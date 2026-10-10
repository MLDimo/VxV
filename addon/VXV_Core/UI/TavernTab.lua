local _, ns = ...

--- The Taverne tab (§7.0): the tavern's scene, its lights and a plaque per place opening its tab (hovering a
--- place, only its plaque changes), the picture following the mouse a little; then the cards of the moment and
--- who is connected with VXV.
local Bus, Modules, Presence, TavernPicture, Theme, Tokens, Window =
    ns.Bus, ns.Modules, ns.Presence, ns.TavernPicture, ns.Theme, ns.Tokens, ns.Window

local PERCENT = 100
local PLAQUE_HEIGHT = 28
local PLAQUE_PADDING = 24
local PLAQUE_RINGS = { { "wood-shade", 3 }, { "copper", 3 } }
-- A hovered plaque rises this much (§4.2).
local PLAQUE_LIFT = 4
-- Parallax (§4.5): the picture is 3 % larger than the scene, and moves at most this many pixels.
local PICTURE_SCALE = 1.03
local PARALLAX_X, PARALLAX_Y = -6, -4
local PARALLAX_SPEED = 8
-- Lights (§4.4): flick jumps in four steps of 0.4 s, pulse breathes in 3 s; each step goes from one opacity to
-- another.
local ANIMATIONS = {
    flick = { steps = { { 0.55, 0.55 }, { 0.8, 0.8 }, { 0.6, 0.6 }, { 0.9, 0.9 } }, duration = 0.4 },
    pulse = { steps = { { 0.45, 0.8 }, { 0.8, 0.45 } }, duration = 1.5, smoothing = "IN_OUT" },
}
local CARD_RINGS = { { "ink", 2 }, { "beam", 3 }, { "ink", 2 } }
local CARD_PADDING = 12
local PADDING, GAP = 22, 22
local FOOTER_HEIGHT, FOOTER_FONT_SIZE = 30, 13
local ACTION_WIDTH, ACTION_HEIGHT = 120, 22
local NOT_YET = "Ce lieu ouvre avec sa phase."

local cards, online = {}, nil

--- Where the plaque sits on its place's zone (§4.2): point, relative point and offset, in the zone's height.
local PLAQUE_ANCHORS = {
    above = function()
        return "BOTTOM", "TOP", 8
    end,
    board = function()
        return "BOTTOM", "TOP", -10
    end,
    middle = function(spot)
        return "TOP", "TOP", -spot:GetHeight() * 0.36
    end,
    table = function(spot)
        return "TOP", "TOP", -spot:GetHeight() * 0.8
    end,
    door = function(spot)
        return "BOTTOM", "BOTTOM", spot:GetHeight() * 0.66
    end,
}

local function placePlaque(plaque, spot, anchor, lift)
    local point, relativePoint, y = PLAQUE_ANCHORS[anchor](spot)
    plaque:ClearAllPoints()
    plaque:SetPoint(point, spot, relativePoint, 0, y + lift)
end

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
    placePlaque(plaque, spot, place.plaque, 0)
    spot.plaque = plaque
    spot:SetScript("OnEnter", function()
        background:SetColorTexture(Theme.Color("plum"))
        placePlaque(plaque, spot, place.plaque, PLAQUE_LIFT)
    end)
    spot:SetScript("OnLeave", function()
        background:SetColorTexture(Theme.Color("wood"))
        placePlaque(plaque, spot, place.plaque, 0)
    end)
    spot:SetScript("OnClick", function()
        Window.Select(place.id)
    end)
end

local function animate(texture, animation)
    local group = texture:CreateAnimationGroup()
    for index, alphas in ipairs(animation.steps) do
        local step = group:CreateAnimation("Alpha")
        step:SetOrder(index)
        step:SetFromAlpha(alphas[1])
        step:SetToAlpha(alphas[2])
        step:SetDuration(animation.duration)
        step:SetSmoothing(animation.smoothing or "NONE")
    end
    group:SetLooping("REPEAT")
    group:Play()
end

--- The hearth, the door of Le Dé Pipé and the forge glow (§4.4): a radial light added to the picture.
local function addLight(scene, light, width, height)
    local left, top, lightWidth, lightHeight = unpack(light.box)
    local texture = scene:CreateTexture(nil, "ARTWORK")
    texture:SetSize(width * lightWidth / PERCENT, height * lightHeight / PERCENT)
    texture:SetPoint("TOPLEFT", width * left / PERCENT, -height * top / PERCENT)
    texture:SetTexture(Theme.MEDIA .. "glow.png")
    texture:SetVertexColor(unpack(light.color))
    texture:SetBlendMode("ADD")
    animate(texture, ANIMATIONS[light.animation])
end

--- The picture follows the cursor (§4.5): its visible part shifts, eased, back to the middle when the cursor
--- leaves the scene.
local function followCursor(scene, picture)
    local visible = 1 / PICTURE_SCALE
    local margin = (1 - visible) / 2
    local x, y = 0, 0
    scene:SetScript("OnUpdate", function(_, elapsed)
        local cursorX, cursorY = GetCursorPosition()
        local scale = scene:GetEffectiveScale()
        local centerX, centerY = scene:GetCenter()
        local width, height = scene:GetWidth(), scene:GetHeight()
        local mx = (cursorX / scale - centerX) / (width / 2)
        local my = (centerY - cursorY / scale) / (height / 2)
        if math.abs(mx) > 1 or math.abs(my) > 1 then
            mx, my = 0, 0
        end
        local ease = math.min(1, elapsed * PARALLAX_SPEED)
        x, y = x + (mx - x) * ease, y + (my - y) * ease
        -- The picture moving left shows more of its right side.
        local u = margin - x * PARALLAX_X / (width * PICTURE_SCALE)
        local v = margin - y * PARALLAX_Y / (height * PICTURE_SCALE)
        picture:SetTexCoord(u, u + visible, v, v + visible)
    end)
end

local function addScene(content)
    local width = content:GetWidth()
    local height = width * Tokens.tavern.height / Tokens.tavern.width
    local scene = CreateFrame("Frame", nil, content)
    scene:SetPoint("TOPLEFT")
    scene:SetSize(width, height)
    local picture = scene:CreateTexture(nil, "BACKGROUND")
    picture:SetAllPoints()
    picture:SetTexture(TavernPicture.Path(), nil, nil, "NEAREST")
    followCursor(scene, picture)
    for _, light in ipairs(Tokens.lights) do
        addLight(scene, light, width, height)
    end
    local vignette = scene:CreateTexture(nil, "OVERLAY")
    vignette:SetAllPoints()
    vignette:SetTexture(Theme.MEDIA .. "vignette.png")
    for _, place in ipairs(Tokens.places) do
        addPlace(scene, place, width, height)
    end
    return scene
end

--- A card under the scene (§7.0): kicker, title, a few lines, and the button opening its place.
local function addCard(content, card, x, y, width, height)
    local frame = CreateFrame("Frame", nil, content)
    frame:SetPoint("TOPLEFT", x, -y)
    frame:SetSize(width, height)
    Theme.Fill(frame, "card"):SetAllPoints()
    Theme.Rings(frame, CARD_RINGS)
    frame.kicker = Theme.Text(frame, "pixel", 13, "sakura")
    frame.kicker:SetPoint("TOPLEFT", CARD_PADDING, -CARD_PADDING)
    frame.kicker:SetText(card.kicker)
    frame.title = Theme.Text(frame, "pixel", 22, "ivory")
    frame.title:SetPoint("TOPLEFT", frame.kicker, "BOTTOMLEFT", 0, -4)
    frame.text = Theme.Text(frame, "text", 13, "lavender")
    frame.text:SetPoint("TOPLEFT", frame.title, "BOTTOMLEFT", 0, -6)
    frame.text:SetWidth(width - 2 * CARD_PADDING)
    frame.text:SetJustifyV("TOP")
    frame.action = Theme.Button(frame, "wood", "", ACTION_WIDTH, ACTION_HEIGHT)
    frame.action:SetPoint("BOTTOMRIGHT", -CARD_PADDING, CARD_PADDING)
    frame.action:SetScript("OnClick", function()
        Window.Select(card.place)
    end)
    frame.card = card
    cards[#cards + 1] = frame
end

--- Each card shows its place's news, or what the place will bring.
local function renderCards()
    for _, frame in ipairs(cards) do
        local module = Modules.ForPlace(frame.card.place, "Card")
        local view = module ~= nil and module.tab.Card()
            or { title = "Bientôt", lines = { frame.card.soon or NOT_YET } }
        frame.title:SetText(view.title)
        frame.text:SetText(table.concat(view.lines, "\n"))
        frame.action:SetShown(view.action ~= nil)
        frame.action:SetText(view.action or "")
    end
end

local function showOnline()
    local names = Presence.Online()
    local version = Presence.Outdated() and Theme.Colored(ns.VERSION .. " · mise à jour disponible", "gold")
        or ns.VERSION
    online.label:SetText(string.format("VXV %s · Connectés avec VXV (%d)", version, #names))
    online.names = names
end

--- Who is connected with VXV, their names on hovering.
local function addOnline(content)
    online = CreateFrame("Frame", nil, content)
    online:SetPoint("BOTTOMRIGHT", -PADDING, 0)
    online:SetSize(content:GetWidth() / 2, FOOTER_HEIGHT)
    online:EnableMouse(true)
    online.label = Theme.Text(online, "text", FOOTER_FONT_SIZE, "muted")
    online.label:SetPoint("RIGHT")
    online.label:SetJustifyH("RIGHT")
    online:SetScript("OnEnter", function()
        ns.Tooltip.Show(online, "ANCHOR_TOP", "Connectés avec VXV", online.names)
    end)
    online:SetScript("OnLeave", ns.Tooltip.Hide)
    showOnline()
end

local function build(content)
    local width, height = content:GetWidth(), content:GetHeight()
    local scene = addScene(content)
    local top = scene:GetHeight() + GAP
    local cardWidth = (width - 2 * PADDING - (#Tokens.cards - 1) * GAP) / #Tokens.cards
    local cardHeight = height - top - FOOTER_HEIGHT
    for index, card in ipairs(Tokens.cards) do
        addCard(content, card, PADDING + (index - 1) * (cardWidth + GAP), top, cardWidth, cardHeight)
    end
    renderCards()
    local hint = Theme.Text(content, "text", FOOTER_FONT_SIZE, "muted")
    hint:SetPoint("BOTTOMLEFT", PADDING, (FOOTER_HEIGHT - FOOTER_FONT_SIZE) / 2)
    hint:SetText("Survole un lieu pour l'éclairer · clique pour entrer")
    addOnline(content)
end

Bus.On("presence.changed", function()
    if online ~= nil then
        showOnline()
    end
end)

Bus.On("tavern.changed", function()
    renderCards()
end)

Modules.Register({
    id = "home",
    name = "Taverne",
    tab = { place = "tavern", Build = build },
})
