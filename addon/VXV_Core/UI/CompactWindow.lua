local _, ns = ...

--- The reduced mode (§7.8), to follow VXV during a raid: a narrow window with a compact header, short tabs
--- (Raid, Paris, Quêtes, Ranking, then "…" for the other places, in the full window) and each place's compact
--- screen, which its module builds (tab.Compact); a place without one says "Bientôt".
local CompactWindow = {}
ns.CompactWindow = CompactWindow

local Bus, Modules, Storage, Theme, Tokens = ns.Bus, ns.Modules, ns.Storage, ns.Theme, ns.Tokens

local FRAME_NAME = "VXV_CompactWindow"
local WIDTH, HEIGHT = 420, 600
local FRAME_RINGS = { { "ink", 2 }, { "copper", 4 }, { "ink", 2 } }
local BORDER = 8
local HEADER_HEIGHT = 48
local EMBLEM_SIZE = 24
local BUTTON_SIZE = 28
local EXPAND_ICON, EXPAND_RING = 12, 2
local GAP = 6
local TABS_TOP, TABS_HEIGHT = 8, 44
local PADDING = 10
local MORE = "…"

local frame, selected
local tabs = {}

local function placeById(placeId)
    for _, place in ipairs(Tokens.places) do
        if place.id == placeId then
            return place
        end
    end
end

local function savePosition()
    local point, _, relativePoint, x, y = frame:GetPoint()
    local settings = Storage.Interface("compact")
    settings.point, settings.relativePoint, settings.x, settings.y = point, relativePoint, x, y
end

local function buildContent(tab)
    local top = BORDER + HEADER_HEIGHT + TABS_HEIGHT
    tab.content = CreateFrame("Frame", nil, frame)
    tab.content:SetPoint("TOPLEFT", BORDER, -top)
    tab.content:SetSize(WIDTH - 2 * BORDER, HEIGHT - BORDER - top)
    local module = Modules.ForPlace(tab.place.id)
    if module ~= nil and module.tab.Compact ~= nil then
        module.tab.Compact(tab.content)
        return
    end
    local soon = Theme.Text(tab.content, "text", 14, "muted")
    soon:SetPoint("TOPLEFT", PADDING, -PADDING)
    soon:SetText("Bientôt : ce lieu ouvre avec sa phase.")
end

--- Shows the compact screen of this place (one of the short tabs).
function CompactWindow.Select(placeId)
    selected = placeId
    for _, tab in ipairs(tabs) do
        local chosen = tab.place.id == placeId
        if chosen and tab.content == nil then
            buildContent(tab)
        end
        if tab.content ~= nil then
            tab.content:SetShown(chosen)
        end
        tab.button:SetSelected(chosen)
    end
end

--- A hollow square: the full window.
local function expandIcon(button)
    local square = CreateFrame("Frame", nil, button)
    square:SetSize(EXPAND_ICON - 2 * EXPAND_RING, EXPAND_ICON - 2 * EXPAND_RING)
    square:SetPoint("CENTER")
    Theme.Rings(square, { { "parchment", EXPAND_RING } })
    return square
end

local function addHeader()
    local header = CreateFrame("Frame", nil, frame)
    frame.header = header
    header:SetPoint("TOPLEFT", BORDER, -BORDER)
    header:SetSize(WIDTH - 2 * BORDER, HEADER_HEIGHT)
    Theme.Fill(header, "wood-night"):SetAllPoints()
    header:EnableMouse(true)
    header:RegisterForDrag("LeftButton")
    header:SetScript("OnDragStart", function()
        frame:StartMoving()
    end)
    header:SetScript("OnDragStop", function()
        frame:StopMovingOrSizing()
        savePosition()
    end)
    local emblem = header:CreateTexture(nil, "ARTWORK")
    emblem:SetSize(EMBLEM_SIZE, EMBLEM_SIZE)
    emblem:SetPoint("LEFT", PADDING, 0)
    emblem:SetTexture(Theme.MEDIA .. "emblem.png", nil, nil, "NEAREST")
    local name = Theme.Text(header, "pixelBold", 16, "ivory")
    name:SetPoint("LEFT", emblem, "RIGHT", 8, 0)
    name:SetText("VXV")
    local mode = Theme.Text(header, "text", 13, "old-paper")
    mode:SetPoint("LEFT", name, "RIGHT", 10, 0)
    mode:SetText("mode réduit")

    local close = Theme.Button(header, "wood", "X", BUTTON_SIZE, BUTTON_SIZE)
    close:SetPoint("RIGHT", -PADDING, 0)
    close:SetScript("OnClick", function()
        frame:Hide()
    end)
    local expand = Theme.Button(header, "wood", "", BUTTON_SIZE, BUTTON_SIZE)
    expand:SetPoint("RIGHT", close, "LEFT", -GAP, 0)
    expand.icon = expandIcon(expand)
    expand:SetScript("OnClick", function()
        Bus.Emit("window.expand", selected)
    end)
    frame.expand = expand
end

local function addTabs()
    local count = #Tokens.compactPlaces + 1
    local width = (WIDTH - 2 * BORDER - 2 * PADDING - (count - 1) * GAP) / count
    local function addTab(index, text, onClick)
        local button = Theme.Tab(frame, text)
        button:SetWidth(width)
        button:SetPoint("TOPLEFT", BORDER + PADDING + (index - 1) * (width + GAP), -(BORDER + HEADER_HEIGHT + TABS_TOP))
        button:SetScript("OnClick", onClick)
        return button
    end
    for index, placeId in ipairs(Tokens.compactPlaces) do
        local place = placeById(placeId)
        local tab = { place = place }
        tab.button = addTab(index, place.short, function()
            CompactWindow.Select(place.id)
        end)
        tabs[#tabs + 1] = tab
    end
    -- The other places, in the full window.
    frame.more = addTab(count, MORE, function()
        Bus.Emit("window.expand", "tavern")
    end)
end

local function create()
    frame = CreateFrame("Frame", FRAME_NAME, UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    local saved = Storage.Interface("compact")
    frame:SetPoint(saved.point or "RIGHT", UIParent, saved.relativePoint or "RIGHT", saved.x or 0, saved.y or 0)
    frame:SetFrameStrata("HIGH")
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    Theme.Fill(frame, "night-window"):SetAllPoints()
    Theme.Rings(frame, FRAME_RINGS, true)
    addHeader()
    addTabs()
    table.insert(UISpecialFrames, FRAME_NAME)
    CompactWindow.Select(Tokens.compactPlaces[1])
end

function CompactWindow.Toggle()
    if frame == nil then
        create()
        frame:Show()
        return
    end
    frame:SetShown(not frame:IsShown())
end

function CompactWindow.Hide()
    if frame ~= nil then
        frame:Hide()
    end
end

--- Opens the reduced mode on a place's compact screen, or on the first one for a place without.
function CompactWindow.Open(placeId)
    if frame == nil then
        create()
    end
    frame:Show()
    local known = false
    for _, tab in ipairs(tabs) do
        known = known or tab.place.id == placeId
    end
    CompactWindow.Select(known and placeId or Tokens.compactPlaces[1])
end

-- A bundle loaded after the window was built: its place's compact screen is built again at the next opening.
Bus.On("modules.registered", function(module)
    for _, tab in ipairs(tabs) do
        if module.tab ~= nil and tab.place.id == module.tab.place and tab.content ~= nil then
            tab.content:Hide()
            tab.content = nil
        end
    end
end)
