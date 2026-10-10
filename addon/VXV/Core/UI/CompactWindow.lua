local ns = select(2, ...).Core

--- The reduced mode (§7.8), to follow VXV during a raid: a narrow window with a compact header, short tabs
--- (Raid, Paris, Quêtes, Ranking, then "…" for the other places, in the full window) and each place's compact
--- screen, which its module builds (tab.Compact); a place without one says "Bientôt".
local CompactWindow = {}
ns.CompactWindow = CompactWindow

local Bus, Modules, PlaceWindow, Screen, Theme, Tokens =
    ns.Bus, ns.Modules, ns.PlaceWindow, ns.Screen, ns.Theme, ns.Tokens

local WIDTH, HEIGHT = 420, 600
local BORDER = 8
local HEADER_HEIGHT = 48
local BUTTON_SIZE = 28
local EXPAND_ICON, EXPAND_RING = 12, 2
local GAP = 6
local TABS_TOP, TABS_HEIGHT = 8, 44
local PADDING = 10
local MORE = "…"

local window

local function buildContent(tab)
    local top = BORDER + HEADER_HEIGHT + TABS_HEIGHT
    tab.content = CreateFrame("Frame", nil, window.frame)
    tab.content:SetPoint("TOPLEFT", BORDER, -top)
    tab.content:SetSize(WIDTH - 2 * BORDER, HEIGHT - BORDER - top)
    local module = Modules.ForPlace(tab.place.id, "Compact")
    if module ~= nil then
        module.tab.Compact(tab.content)
        return
    end
    local soon = Theme.Text(tab.content, "text", 14, "muted")
    soon:SetPoint("TOPLEFT", PADDING, -PADDING)
    soon:SetText("Bientôt : ce lieu ouvre avec sa phase.")
end

--- A hollow square: the full window.
local function expandIcon(button)
    local square = CreateFrame("Frame", nil, button)
    square:SetSize(EXPAND_ICON - 2 * EXPAND_RING, EXPAND_ICON - 2 * EXPAND_RING)
    square:SetPoint("CENTER")
    Theme.Rings(square, { { "parchment", EXPAND_RING } })
    return square
end

--- The header's mode and buttons, then the short tabs: the compact places, and "…" for the others.
local function decorate()
    local header, frame = window.header, window.frame
    local mode = Theme.Text(header, "text", 13, "old-paper")
    mode:SetPoint("LEFT", window.name, "RIGHT", 10, 0)
    mode:SetText("mode réduit")
    local close = Theme.Button(header, "wood", "X", BUTTON_SIZE, BUTTON_SIZE)
    close:SetPoint("RIGHT", -PADDING, 0)
    close:SetScript("OnClick", window.Hide)
    local expand = Theme.Button(header, "wood", "", BUTTON_SIZE, BUTTON_SIZE)
    expand:SetPoint("RIGHT", close, "LEFT", -GAP, 0)
    expand.icon = expandIcon(expand)
    expand:SetScript("OnClick", function()
        Bus.Emit("window.expand", window.selected)
    end)
    frame.expand = expand

    local count = #Tokens.compactPlaces + 1
    local width = (WIDTH - 2 * BORDER - 2 * PADDING - (count - 1) * GAP) / count
    local function addTab(index, text)
        local button = Theme.Tab(frame, text)
        button:SetWidth(width)
        button:SetPoint("TOPLEFT", BORDER + PADDING + (index - 1) * (width + GAP), -(BORDER + HEADER_HEIGHT + TABS_TOP))
        return button
    end
    for index, placeId in ipairs(Tokens.compactPlaces) do
        local place = Screen.Place(placeId)
        window.AddTab(place, addTab(index, place.short))
    end
    -- The other places, in the full window.
    frame.more = addTab(count, MORE)
    frame.more:SetScript("OnClick", function()
        Bus.Emit("window.expand", "tavern")
    end)
end

window = PlaceWindow.Create({
    name = "VXV_CompactWindow",
    width = WIDTH,
    height = HEIGHT,
    rings = { { "ink", 2 }, { "copper", 4 }, { "ink", 2 } },
    border = BORDER,
    header = { height = HEADER_HEIGHT, emblem = 24, left = PADDING, gap = 8 },
    storage = "compact",
    point = "RIGHT",
    first = Tokens.compactPlaces[1],
    Build = buildContent,
    Decorate = decorate,
})

CompactWindow.Select, CompactWindow.Toggle, CompactWindow.Hide = window.Select, window.Toggle, window.Hide

local function isCompact(placeId)
    for _, compact in ipairs(Tokens.compactPlaces) do
        if compact == placeId then
            return true
        end
    end
    return false
end

--- Opens the reduced mode on a place's compact screen, or on the first one for a place without.
function CompactWindow.Open(placeId)
    window.Open(isCompact(placeId) and placeId or Tokens.compactPlaces[1])
end
