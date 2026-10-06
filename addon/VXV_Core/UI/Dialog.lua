local _, ns = ...

--- A small window in the charter, over the game and the windows (the loot panel, the text window): copper rings, a
--- header with its title and a close button, moved by dragging; named, so that Escape closes it.
local Dialog = {}
ns.Dialog = Dialog

local Theme = ns.Theme

local RINGS = { { "ink", 2 }, { "copper", 3 }, { "ink", 2 } }
local BORDER = 7
local HEADER_HEIGHT = 34
local PADDING = 12
local CLOSE_SIZE = 22
-- Above the windows (HIGH strata): in the same strata, the panels of a screen, nested levels deep, would lie over
-- the dialog's background (seen on 6 October with the sign-up opened from the Raid screen).
local STRATA = "DIALOG"

--- Creates the dialog, hidden; returns it and its body (sized, under the header).
function Dialog.Create(name, width, height, title)
    local frame = CreateFrame("Frame", name, UIParent)
    frame:Hide()
    frame:SetSize(width, height)
    frame:SetPoint("CENTER")
    frame:SetFrameStrata(STRATA)
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", frame.StartMoving)
    frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
    Theme.Fill(frame, "night-window"):SetAllPoints()
    Theme.Rings(frame, RINGS, true)

    local header = Theme.Fill(frame, "wood-night", "ARTWORK")
    header:SetPoint("TOPLEFT", BORDER, -BORDER)
    header:SetPoint("TOPRIGHT", -BORDER, -BORDER)
    header:SetHeight(HEADER_HEIGHT)
    frame.title = Theme.Text(frame, "pixel", 16, "ivory")
    frame.title:SetPoint("LEFT", header, "LEFT", PADDING, 0)
    frame.title:SetText(title)
    local close = Theme.Button(frame, "wood", "X", CLOSE_SIZE, CLOSE_SIZE)
    close:SetPoint("RIGHT", header, "RIGHT", -(HEADER_HEIGHT - CLOSE_SIZE) / 2, 0)
    close:SetScript("OnClick", function()
        frame:Hide()
    end)

    local body = CreateFrame("Frame", nil, frame)
    body:SetPoint("TOPLEFT", BORDER + PADDING, -(BORDER + HEADER_HEIGHT + PADDING))
    body:SetSize(width - 2 * (BORDER + PADDING), height - 2 * (BORDER + PADDING) - HEADER_HEIGHT)
    table.insert(UISpecialFrames, name)
    return frame, body
end
