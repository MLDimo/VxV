local _, ns = ...

--- The main window: one tab per module that has one, built at the first opening.
local Window = {}
ns.Window = Window

local Bus, Modules, Storage = ns.Bus, ns.Modules, ns.Storage

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_Window"
local WIDTH, HEIGHT = 640, 440
local INSET = 12
local TITLE_HEIGHT = 30
local TAB_WIDTH, TAB_HEIGHT, TAB_GAP = 110, 24, 4

local frame
local tabs = {}

local function savePosition()
    local point, _, relativePoint, x, y = frame:GetPoint()
    local settings = Storage.Interface("window")
    settings.point, settings.relativePoint, settings.x, settings.y = point, relativePoint, x, y
end

local function selectTab(chosen)
    for _, tab in ipairs(tabs) do
        local isChosen = tab == chosen
        if isChosen and tab.content == nil then
            tab.content = CreateFrame("Frame", nil, frame)
            tab.content:SetPoint("TOPLEFT", INSET, -(TITLE_HEIGHT + TAB_HEIGHT + INSET))
            tab.content:SetPoint("BOTTOMRIGHT", -INSET, INSET)
            tab.module.tab.Build(tab.content)
        end
        if tab.content ~= nil then
            tab.content:SetShown(isChosen)
        end
        if isChosen then
            tab.button:Disable()
        else
            tab.button:Enable()
        end
    end
end

local function addTab(module)
    local button = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    button:SetSize(TAB_WIDTH, TAB_HEIGHT)
    button:SetPoint("TOPLEFT", INSET + #tabs * (TAB_WIDTH + TAB_GAP), -TITLE_HEIGHT)
    button:SetText(module.tab.title)
    local tab = { module = module, button = button }
    button:SetScript("OnClick", function()
        selectTab(tab)
    end)
    tabs[#tabs + 1] = tab
end

local function create()
    local ok, templated = pcall(CreateFrame, "Frame", FRAME_NAME, UIParent, "BasicFrameTemplateWithInset")
    frame = ok and templated or CreateFrame("Frame", FRAME_NAME, UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    local saved = Storage.Interface("window")
    frame:SetPoint(saved.point or "CENTER", UIParent, saved.relativePoint or "CENTER", saved.x or 0, saved.y or 0)
    frame:SetFrameStrata("HIGH")
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", frame.StartMoving)
    frame:SetScript("OnDragStop", function()
        frame:StopMovingOrSizing()
        savePosition()
    end)
    local title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    title:SetPoint("TOP", 0, -6)
    title:SetText("VXV")
    table.insert(UISpecialFrames, FRAME_NAME)
    for _, module in ipairs(Modules.All()) do
        if module.tab ~= nil then
            addTab(module)
        end
    end
    if tabs[1] ~= nil then
        selectTab(tabs[1])
    end
end

function Window.Toggle()
    if frame == nil then
        create()
        frame:Show()
        return
    end
    frame:SetShown(not frame:IsShown())
end

-- A bundle loaded on demand after the window was built gets its tab at once.
Bus.On("modules.registered", function(module)
    if frame ~= nil and module.tab ~= nil then
        addTab(module)
    end
end)
