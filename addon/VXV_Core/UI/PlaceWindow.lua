local _, ns = ...

--- What the full window (§6) and the reduced mode (§7.8) share: a movable frame in the charter whose position is
--- saved and that Escape closes, a header to drag it with the emblem and the guild's name, and the tabs of places
--- whose screens are built at their first opening (and again when a bundle loaded later brings their module).
local PlaceWindow = {}
ns.PlaceWindow = PlaceWindow

local Bus, Storage, Theme = ns.Bus, ns.Storage, ns.Theme

local UNDERLINE = 1

--- Options: name (the frame's global name: the client closes the frames listed in UISpecialFrames on Escape),
--- width, height, rings, border, header = { height, emblem (size), left, gap, underline }, storage (the saved
--- position's key), point (where it opens the first time), first (the place shown at creation), Build(tab) (builds
--- tab.content), Decorate(window) (adds the tabs and the header's buttons).
--- Returns the window: { frame, header, name, tabs, selected, AddTab(place, button), Select, Open, Toggle, Hide }.
function PlaceWindow.Create(options)
    local window = { tabs = {} }

    --- Shows the tab of this place, its screen built at its first opening.
    function window.Select(placeId)
        window.selected = placeId
        for _, tab in ipairs(window.tabs) do
            local chosen = tab.place.id == placeId
            if chosen and tab.content == nil then
                options.Build(tab)
            end
            if tab.content ~= nil then
                tab.content:SetShown(chosen)
            end
            tab.button:SetSelected(chosen)
        end
    end

    --- A place's tab: its button shows its screen.
    function window.AddTab(place, button)
        window.tabs[#window.tabs + 1] = { place = place, button = button }
        button:SetScript("OnClick", function()
            window.Select(place.id)
        end)
    end

    local function savePosition()
        local point, _, relativePoint, x, y = window.frame:GetPoint()
        local settings = Storage.Interface(options.storage)
        settings.point, settings.relativePoint, settings.x, settings.y = point, relativePoint, x, y
    end

    local function addHeader()
        local style, frame = options.header, window.frame
        local header = CreateFrame("Frame", nil, frame)
        header:SetPoint("TOPLEFT", options.border, -options.border)
        header:SetSize(options.width - 2 * options.border, style.height)
        Theme.Fill(header, "wood-night"):SetAllPoints()
        if style.underline then
            local line = Theme.Fill(header, "amethyst", "ARTWORK")
            line:SetPoint("BOTTOMLEFT")
            line:SetPoint("BOTTOMRIGHT")
            line:SetHeight(UNDERLINE)
        end
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
        emblem:SetSize(style.emblem, style.emblem)
        emblem:SetPoint("LEFT", style.left, 0)
        emblem:SetTexture(Theme.MEDIA .. "emblem.png", nil, nil, "NEAREST")
        local name = Theme.Text(header, "pixelBold", 16, "ivory")
        name:SetPoint("LEFT", emblem, "RIGHT", style.gap, 0)
        name:SetText("VXV")
        frame.header, window.header, window.name = header, header, name
    end

    local function create()
        local frame = CreateFrame("Frame", options.name, UIParent)
        window.frame = frame
        frame:SetSize(options.width, options.height)
        local saved = Storage.Interface(options.storage)
        frame:SetPoint(saved.point or options.point, UIParent, saved.relativePoint or options.point, saved.x or 0,
            saved.y or 0)
        frame:SetFrameStrata("HIGH")
        frame:SetMovable(true)
        frame:SetClampedToScreen(true)
        frame:EnableMouse(true)
        Theme.Fill(frame, "night-window"):SetAllPoints()
        Theme.Rings(frame, options.rings, true)
        addHeader()
        options.Decorate(window)
        table.insert(UISpecialFrames, options.name)
        window.Select(options.first)
    end

    function window.Toggle()
        if window.frame == nil then
            create()
            window.frame:Show()
            return
        end
        window.frame:SetShown(not window.frame:IsShown())
    end

    function window.Hide()
        if window.frame ~= nil then
            window.frame:Hide()
        end
    end

    --- Opens the window on a place's tab.
    function window.Open(placeId)
        if window.frame == nil then
            create()
        end
        window.frame:Show()
        window.Select(placeId)
    end

    -- A bundle loaded after the window was built: its place's screen is built again at its next opening.
    Bus.On("modules.registered", function(module)
        for _, tab in ipairs(window.tabs) do
            if module.tab ~= nil and tab.place.id == module.tab.place and tab.content ~= nil then
                tab.content:Hide()
                tab.content = nil
            end
        end
    end)

    return window
end
