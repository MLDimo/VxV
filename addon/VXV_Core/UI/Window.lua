local _, ns = ...

--- The main window in the charter (§6): a frame of four rings, a header with the emblem and one tab per place of
--- the tavern (Taverne first), each tab built at its first opening over the tavern framed on its place. A place
--- no module provides yet shows its screen with "Bientôt". The window shrinks on small screens.
local Window = {}
ns.Window = Window

local Bus, Modules, PlaceWindow, Screen, TavernPicture, Theme, Tokens =
    ns.Bus, ns.Modules, ns.PlaceWindow, ns.Screen, ns.TavernPicture, ns.Theme, ns.Tokens

local WIDTH, HEIGHT = 1000, 680
local BORDER = 12
local HEADER_HEIGHT = 56
local TAB_GAP = 2
local CLOSE_SIZE = 28
local REDUCE_ICON_WIDTH, REDUCE_ICON_HEIGHT, REDUCE_ICON_BOTTOM = 12, 3, 8
local SCREEN_MARGIN = 40
local TAVERN = { id = "tavern", name = "Taverne" }
local PERCENT = 100
-- Under everything the screen draws in its background layer.
local BACKDROP_LEVEL = -8
-- The tabs of a place several modules share, above their sections' frames.
local SECTION_TABS_LEVEL = 20

local window

--- The places in the order of the tabs: the Taverne, then the places of the tavern.
local function placeList()
    local list = { TAVERN }
    for _, place in ipairs(Tokens.places) do
        list[#list + 1] = place
    end
    return list
end

--- The screen's background (§6): the tavern framed on its place, very dark under a veil.
local function addBackdrop(content, backdrop)
    local width, height = content:GetWidth(), content:GetHeight()
    local pictureWidth = width * backdrop.zoom
    local pictureHeight = pictureWidth * Tokens.tavern.height / Tokens.tavern.width
    -- As CSS's background-position: x % of the picture on x % of the screen.
    local left = (pictureWidth - width) * backdrop.position[1] / PERCENT / pictureWidth
    local top = (pictureHeight - height) * backdrop.position[2] / PERCENT / pictureHeight
    local picture = content:CreateTexture(nil, "BACKGROUND", nil, BACKDROP_LEVEL)
    picture:SetAllPoints()
    picture:SetTexture(TavernPicture.Path(), nil, nil, "NEAREST")
    picture:SetTexCoord(left, left + width / pictureWidth, top, top + height / pictureHeight)
    picture:SetAlpha(backdrop.opacity)
    local veil = content:CreateTexture(nil, "BACKGROUND", nil, BACKDROP_LEVEL + 1)
    veil:SetAllPoints()
    veil:SetTexture(Theme.MEDIA .. "veil.png")
end

--- The screen of a place no module provides yet.
local function buildComingSoon(content, place)
    Screen.Head(content, place.subtitle, place.kicker, place.name).subtitle:SetText(
        "Bientôt : ce lieu ouvre avec sa phase.")
end

--- A place several modules share: one section per module, and tabs above them to choose one.
local function buildSections(content, modules)
    local sections, buttons = {}, {}
    local function select(chosen)
        for index, section in ipairs(sections) do
            section:SetShown(index == chosen)
            buttons[index]:SetSelected(index == chosen)
        end
    end
    local width = 0
    for index, module in ipairs(modules) do
        local section = CreateFrame("Frame", nil, content)
        section:SetPoint("TOPLEFT")
        section:SetSize(content:GetWidth(), content:GetHeight())
        module.tab.Build(section)
        sections[index] = section
        buttons[index] = Theme.Tab(content, module.tab.name or module.name)
        buttons[index]:SetFrameLevel(section:GetFrameLevel() + SECTION_TABS_LEVEL)
        buttons[index]:SetScript("OnClick", function()
            select(index)
        end)
        width = width + buttons[index]:GetWidth() + (index > 1 and TAB_GAP or 0)
    end
    local left = -width / 2
    for _, button in ipairs(buttons) do
        button:SetPoint("TOPLEFT", content, "TOP", left, -Screen.PADDING)
        left = left + button:GetWidth() + TAB_GAP
    end
    select(1)
end

local function buildContent(tab)
    tab.content = CreateFrame("Frame", nil, window.frame)
    tab.content:SetPoint("TOPLEFT", BORDER, -(BORDER + HEADER_HEIGHT))
    tab.content:SetSize(WIDTH - 2 * BORDER, HEIGHT - 2 * BORDER - HEADER_HEIGHT)
    if tab.place.backdrop ~= nil then
        addBackdrop(tab.content, tab.place.backdrop)
    end
    local modules = Modules.Of(tab.place.id)
    if #modules == 0 then
        buildComingSoon(tab.content, tab.place)
    elseif #modules == 1 then
        modules[1].tab.Build(tab.content)
    else
        buildSections(tab.content, modules)
    end
end

--- The header's tabs and buttons: a tab per place, the reduced mode and the closing.
local function decorate()
    local header, previous = window.header, window.name
    for _, place in ipairs(placeList()) do
        local button = Theme.Tab(header, place.name)
        button:SetPoint("LEFT", previous, "RIGHT", previous == window.name and 24 or TAB_GAP, 0)
        window.AddTab(place, button)
        previous = button
    end
    local close = Theme.Button(header, "wood", "X", CLOSE_SIZE, CLOSE_SIZE)
    close:SetPoint("RIGHT", -12, 0)
    close:SetScript("OnClick", window.Hide)
    -- The reduced mode (§7.8), on the same place when it has a compact screen.
    local reduce = Theme.Button(header, "wood", "", CLOSE_SIZE, CLOSE_SIZE)
    reduce:SetPoint("RIGHT", close, "LEFT", -TAB_GAP * 3, 0)
    local bar = Theme.Fill(reduce, "parchment", "ARTWORK")
    bar:SetSize(REDUCE_ICON_WIDTH, REDUCE_ICON_HEIGHT)
    bar:SetPoint("BOTTOM", 0, REDUCE_ICON_BOTTOM)
    reduce.icon = bar
    reduce:SetScript("OnClick", function()
        Bus.Emit("window.reduce", window.selected)
    end)
    window.frame.reduce = reduce
    -- Smaller than the screen, whatever its size (§6: resized proportionally).
    local available = UIParent:GetHeight()
    if available ~= nil and available > 0 and available < HEIGHT + SCREEN_MARGIN then
        window.frame:SetScale((available - SCREEN_MARGIN) / HEIGHT)
    end
end

window = PlaceWindow.Create({
    name = "VXV_Window",
    width = WIDTH,
    height = HEIGHT,
    rings = { { "ink", 3 }, { "copper", 4 }, { "ink", 3 }, { "beam", 2 } },
    border = BORDER,
    header = { height = HEADER_HEIGHT, emblem = 30, left = 12, gap = 10, underline = true },
    storage = "window",
    point = "CENTER",
    first = TAVERN.id,
    Build = buildContent,
    Decorate = decorate,
})

--- Shows the tab of this place ("tavern", "raid", …), opens the window on it, toggles or hides the window.
Window.Select, Window.Open, Window.Toggle, Window.Hide = window.Select, window.Open, window.Toggle, window.Hide
