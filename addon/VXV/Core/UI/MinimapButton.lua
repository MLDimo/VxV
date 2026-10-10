local ns = select(2, ...).Core

--- The VXV icon around the minimap: click to open the window, drag to move it around.
--- Also listed in the client's addon compartment when it has one.
local MinimapButton = {}
ns.MinimapButton = MinimapButton

local Compat, Storage, Tooltip, Windows = ns.Compat, ns.Storage, ns.Tooltip, ns.Windows

local DEFAULT_ANGLE = 225
local SIZE = 31
local ICON_SIZE = 20
local BORDER_SIZE = 53
-- How far beyond the minimap's edge the icon sits, and how far it stays from a square corner.
local EDGE_OFFSET = 5
local CORNER_INSET = 10
local ICON = "Interface\\Icons\\INV_Misc_GroupNeedMore"

-- For each minimap shape, whether each quadrant is round (true) or square (false):
-- bottom-right, bottom-left, top-right, top-left. Minimap addons tell their shape through GetMinimapShape.
local SHAPES = {
    ROUND = { true, true, true, true },
    SQUARE = { false, false, false, false },
    ["CORNER-TOPLEFT"] = { false, false, false, true },
    ["CORNER-TOPRIGHT"] = { false, false, true, false },
    ["CORNER-BOTTOMLEFT"] = { false, true, false, false },
    ["CORNER-BOTTOMRIGHT"] = { true, false, false, false },
    ["SIDE-LEFT"] = { false, true, false, true },
    ["SIDE-RIGHT"] = { true, false, true, false },
    ["SIDE-TOP"] = { false, false, true, true },
    ["SIDE-BOTTOM"] = { true, true, false, false },
    ["TRICORNER-TOPLEFT"] = { false, true, true, true },
    ["TRICORNER-TOPRIGHT"] = { true, false, true, true },
    ["TRICORNER-BOTTOMLEFT"] = { true, true, false, true },
    ["TRICORNER-BOTTOMRIGHT"] = { true, true, true, false },
}

--- Offset of the icon from the minimap's center, for an angle in degrees, following the minimap's shape.
function MinimapButton.Offset(angle, shape, width, height)
    local radians = math.rad(angle)
    local x, y = math.cos(radians), math.sin(radians)
    local quadrant = 1 + (x < 0 and 1 or 0) + (y > 0 and 2 or 0)
    local halfWidth, halfHeight = width / 2 + EDGE_OFFSET, height / 2 + EDGE_OFFSET
    if (SHAPES[shape] or SHAPES.ROUND)[quadrant] then
        return x * halfWidth, y * halfHeight
    end
    local diagonalWidth = math.sqrt(2 * halfWidth ^ 2) - CORNER_INSET
    local diagonalHeight = math.sqrt(2 * halfHeight ^ 2) - CORNER_INSET
    return math.max(-halfWidth, math.min(x * diagonalWidth, halfWidth)),
        math.max(-halfHeight, math.min(y * diagonalHeight, halfHeight))
end

local function minimapShape()
    local ok, shape = Compat.GetMinimapShape()
    return ok and shape or "ROUND"
end

local function place(button, minimap, angle)
    local x, y = MinimapButton.Offset(angle, minimapShape(), minimap:GetWidth(), minimap:GetHeight())
    button:ClearAllPoints()
    button:SetPoint("CENTER", minimap, "CENTER", x, y)
end

--- Angle of the cursor around the minimap's center, in degrees.
local function cursorAngle(minimap)
    local ok, cursorX, cursorY = Compat.GetCursorPosition()
    if not ok then
        return nil
    end
    local centerX, centerY = minimap:GetCenter()
    local scale = minimap:GetEffectiveScale()
    return math.deg(math.atan2(cursorY / scale - centerY, cursorX / scale - centerX)) % 360
end

local function showTooltip(button)
    Tooltip.Show(button, "ANCHOR_LEFT", "VXV", { "Clic : ouvrir ou fermer la fenêtre", "Glisser : déplacer l'icône" })
end

local function addTexture(button, path, size, layer)
    local texture = button:CreateTexture(nil, layer)
    texture:SetTexture(path)
    texture:SetSize(size, size)
    return texture
end

--- Creates the icon once the minimap exists (after login); without a minimap, VXV stays reachable by /vxv.
function MinimapButton.Create()
    local minimap = Compat.Resolve("Minimap")
    if minimap == nil then
        return
    end
    local settings = Storage.Interface("minimap")
    local button = CreateFrame("Button", nil, minimap)
    button:SetSize(SIZE, SIZE)
    button:SetFrameStrata("MEDIUM")
    button:SetFrameLevel(minimap:GetFrameLevel() + 8)
    addTexture(button, ICON, ICON_SIZE, "BACKGROUND"):SetPoint("CENTER")
    addTexture(button, "Interface\\Minimap\\MiniMap-TrackingBorder", BORDER_SIZE, "OVERLAY"):SetPoint("TOPLEFT")
    button:RegisterForClicks("AnyUp")
    button:RegisterForDrag("LeftButton")
    button:SetScript("OnClick", Windows.Toggle)
    button:SetScript("OnEnter", showTooltip)
    button:SetScript("OnLeave", Tooltip.Hide)
    button:SetScript("OnDragStart", function()
        Tooltip.Hide()
        button:SetScript("OnUpdate", function()
            local angle = cursorAngle(minimap)
            if angle ~= nil then
                settings.angle = angle
                place(button, minimap, angle)
            end
        end)
    end)
    button:SetScript("OnDragStop", function()
        button:SetScript("OnUpdate", nil)
    end)
    place(button, minimap, tonumber(settings.angle) or DEFAULT_ANGLE)

    local compartment = Compat.Resolve("AddonCompartmentFrame")
    if compartment ~= nil and type(compartment.RegisterAddon) == "function" then
        compartment:RegisterAddon({ text = "VXV", icon = ICON, notCheckable = true, func = Windows.Toggle })
    end
end
