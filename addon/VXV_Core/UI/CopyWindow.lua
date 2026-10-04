local _, ns = ...

--- A window showing a text ready to copy (Ctrl+C), such as the guild roster for the website.
local CopyWindow = {}
ns.CopyWindow = CopyWindow

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_CopyWindow"
local WIDTH, HEIGHT = 520, 380
local INSET = 12
local TITLE_HEIGHT = 30
local SCROLLBAR_WIDTH = 30

local frame

local function create()
    local ok, templated = pcall(CreateFrame, "Frame", FRAME_NAME, UIParent, "BasicFrameTemplateWithInset")
    frame = ok and templated or CreateFrame("Frame", FRAME_NAME, UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    frame:SetPoint("CENTER")
    frame:SetFrameStrata("DIALOG")
    frame:SetMovable(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", frame.StartMoving)
    frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
    local scroll = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", INSET, -TITLE_HEIGHT)
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, INSET)
    local editBox = CreateFrame("EditBox", nil, scroll)
    editBox:SetMultiLine(true)
    editBox:SetAutoFocus(false)
    editBox:SetFontObject(ChatFontNormal)
    editBox:SetWidth(WIDTH - INSET - SCROLLBAR_WIDTH * 2)
    editBox:SetScript("OnEscapePressed", function()
        frame:Hide()
    end)
    scroll:SetScrollChild(editBox)
    frame.editBox = editBox
    table.insert(UISpecialFrames, FRAME_NAME)
end

--- Shows the text selected, ready for Ctrl+C.
function CopyWindow.Show(text)
    if frame == nil then
        create()
    end
    frame.editBox:SetText(text)
    frame:Show()
    frame.editBox:SetFocus()
    frame.editBox:HighlightText()
end
