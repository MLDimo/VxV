local _, ns = ...

--- Read-only window showing a block of text ready to copy (Ctrl+C).
local Report = {}
ns.Report = Report

local FRAME_NAME = "VXV_ProbeReportFrame"
local FRAME_WIDTH, FRAME_HEIGHT = 760, 480
local INSET = 12

local frame

local function createFrame()
    local ok, created = pcall(CreateFrame, "Frame", FRAME_NAME, UIParent, "BasicFrameTemplateWithInset")
    local window = ok and created or CreateFrame("Frame", FRAME_NAME, UIParent)
    window:SetSize(FRAME_WIDTH, FRAME_HEIGHT)
    window:SetPoint("CENTER")
    window:SetFrameStrata("DIALOG")
    window:SetMovable(true)
    window:EnableMouse(true)
    window:RegisterForDrag("LeftButton")
    window:SetScript("OnDragStart", window.StartMoving)
    window:SetScript("OnDragStop", window.StopMovingOrSizing)

    local scroll = CreateFrame("ScrollFrame", nil, window, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", INSET, -30)
    scroll:SetPoint("BOTTOMRIGHT", -32, INSET)

    local editBox = CreateFrame("EditBox", nil, scroll)
    editBox:SetMultiLine(true)
    editBox:SetAutoFocus(false)
    editBox:SetFontObject(ChatFontNormal)
    editBox:SetWidth(FRAME_WIDTH - 60)
    editBox:SetScript("OnEscapePressed", function()
        window:Hide()
    end)
    scroll:SetScrollChild(editBox)

    window.editBox = editBox
    table.insert(UISpecialFrames, FRAME_NAME)
    return window
end

function Report.Show(text)
    frame = frame or createFrame()
    frame.editBox:SetText(text)
    frame:Show()
    frame.editBox:SetFocus()
    frame.editBox:HighlightText()
end
