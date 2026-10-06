local _, ns = ...

--- The main window in the charter (§6): a frame of four rings, a header with the emblem and one tab per place of
--- the tavern (Taverne first), each tab built at its first opening over the tavern framed on its place. A place
--- no module provides yet shows its screen with "Bientôt". The window shrinks on small screens.
local Window = {}
ns.Window = Window

local Bus, Modules, Storage, Theme, Tokens = ns.Bus, ns.Modules, ns.Storage, ns.Theme, ns.Tokens

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_Window"
local WIDTH, HEIGHT = 1000, 680
local FRAME_RINGS = { { "ink", 3 }, { "copper", 4 }, { "ink", 3 }, { "beam", 2 } }
local BORDER = 12
local HEADER_HEIGHT = 56
local EMBLEM_SIZE = 30
local TAB_GAP = 2
local CLOSE_SIZE = 28
local REDUCE_ICON_WIDTH, REDUCE_ICON_HEIGHT, REDUCE_ICON_BOTTOM = 12, 3, 8
local SCREEN_MARGIN = 40
local SCREEN_PADDING = 22
local TAVERN = { id = "tavern", name = "Taverne" }
local PERCENT = 100
-- Under everything the screen draws in its background layer.
local BACKDROP_LEVEL = -8
-- The tabs of a place several modules share, above their sections' frames.
local SECTION_TABS_LEVEL = 20

local frame, selected
local tabs = {}

--- The places in the order of the tabs: the Taverne, then the places of the tavern.
local function placeList()
    local list = { TAVERN }
    for _, place in ipairs(Tokens.places) do
        list[#list + 1] = place
    end
    return list
end

local function savePosition()
    local point, _, relativePoint, x, y = frame:GetPoint()
    local settings = Storage.Interface("window")
    settings.point, settings.relativePoint, settings.x, settings.y = point, relativePoint, x, y
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
    picture:SetTexture(Theme.MEDIA .. "taverne.png", nil, nil, "NEAREST")
    picture:SetTexCoord(left, left + width / pictureWidth, top, top + height / pictureHeight)
    picture:SetAlpha(backdrop.opacity)
    local veil = content:CreateTexture(nil, "BACKGROUND", nil, BACKDROP_LEVEL + 1)
    veil:SetAllPoints()
    veil:SetTexture(Theme.MEDIA .. "veil.png")
end

--- The screen of a place no module provides yet.
local function buildComingSoon(content, place)
    Theme.ScreenHeader(content, place.subtitle, place.kicker, place.name)
        :SetPoint("TOPLEFT", SCREEN_PADDING, -SCREEN_PADDING)
    local soon = Theme.Text(content, "text", 15, "muted")
    soon:SetPoint("TOPLEFT", SCREEN_PADDING, -110)
    soon:SetText("Bientôt : ce lieu ouvre avec sa phase.")
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
        button:SetPoint("TOPLEFT", content, "TOP", left, -SCREEN_PADDING)
        left = left + button:GetWidth() + TAB_GAP
    end
    select(1)
end

local function buildContent(tab)
    tab.content = CreateFrame("Frame", nil, frame)
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

--- Shows the tab of this place ("tavern", "raid", …).
function Window.Select(placeId)
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

local function addHeader()
    local header = CreateFrame("Frame", nil, frame)
    frame.header = header
    header:SetPoint("TOPLEFT", BORDER, -BORDER)
    header:SetSize(WIDTH - 2 * BORDER, HEADER_HEIGHT)
    Theme.Fill(header, "wood-night"):SetAllPoints()
    local line = Theme.Fill(header, "amethyst", "ARTWORK")
    line:SetPoint("BOTTOMLEFT")
    line:SetPoint("BOTTOMRIGHT")
    line:SetHeight(1)
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
    emblem:SetPoint("LEFT", 12, 0)
    emblem:SetTexture(Theme.MEDIA .. "emblem.png", nil, nil, "NEAREST")
    local name = Theme.Text(header, "pixelBold", 16, "ivory")
    name:SetPoint("LEFT", emblem, "RIGHT", 10, 0)
    name:SetText("VXV")

    local previous = name
    for _, place in ipairs(placeList()) do
        local button = Theme.Tab(header, place.name)
        button:SetPoint("LEFT", previous, "RIGHT", previous == name and 24 or TAB_GAP, 0)
        local tab = { place = place, button = button }
        button:SetScript("OnClick", function()
            Window.Select(place.id)
        end)
        tabs[#tabs + 1] = tab
        previous = button
    end

    local close = Theme.Button(header, "wood", "X", CLOSE_SIZE, CLOSE_SIZE)
    close:SetPoint("RIGHT", -12, 0)
    close:SetScript("OnClick", function()
        frame:Hide()
    end)
    -- The reduced mode (§7.8), on the same place when it has a compact screen.
    local reduce = Theme.Button(header, "wood", "", CLOSE_SIZE, CLOSE_SIZE)
    reduce:SetPoint("RIGHT", close, "LEFT", -TAB_GAP * 3, 0)
    local bar = Theme.Fill(reduce, "parchment", "ARTWORK")
    bar:SetSize(REDUCE_ICON_WIDTH, REDUCE_ICON_HEIGHT)
    bar:SetPoint("BOTTOM", 0, REDUCE_ICON_BOTTOM)
    reduce.icon = bar
    reduce:SetScript("OnClick", function()
        Bus.Emit("window.reduce", selected)
    end)
    frame.reduce = reduce
end

--- Smaller than the screen, whatever its size (§6: resized proportionally).
local function fitScreen()
    local available = UIParent:GetHeight()
    if available ~= nil and available > 0 and available < HEIGHT + SCREEN_MARGIN then
        frame:SetScale((available - SCREEN_MARGIN) / HEIGHT)
    end
end

local function create()
    frame = CreateFrame("Frame", FRAME_NAME, UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    local saved = Storage.Interface("window")
    frame:SetPoint(saved.point or "CENTER", UIParent, saved.relativePoint or "CENTER", saved.x or 0, saved.y or 0)
    frame:SetFrameStrata("HIGH")
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    Theme.Fill(frame, "night-window"):SetAllPoints()
    Theme.Rings(frame, FRAME_RINGS, true)
    addHeader()
    fitScreen()
    table.insert(UISpecialFrames, FRAME_NAME)
    Window.Select(TAVERN.id)
end

function Window.Toggle()
    if frame == nil then
        create()
        frame:Show()
        return
    end
    frame:SetShown(not frame:IsShown())
end

function Window.Hide()
    if frame ~= nil then
        frame:Hide()
    end
end

--- Opens the window on a place's tab.
function Window.Open(placeId)
    if frame == nil then
        create()
    end
    frame:Show()
    Window.Select(placeId)
end

-- A bundle loaded after the window was built: its place's tab shows its screen at the next opening.
Bus.On("modules.registered", function(module)
    if frame == nil or module.tab == nil then
        return
    end
    for _, tab in ipairs(tabs) do
        if tab.place.id == module.tab.place and tab.content ~= nil then
            tab.content:Hide()
            tab.content = nil
        end
    end
end)
