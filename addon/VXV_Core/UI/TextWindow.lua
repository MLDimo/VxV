local _, ns = ...

--- A window holding a text: shown selected, ready to copy (Ctrl+C), or empty, to paste into and confirm.
local TextWindow = {}
ns.TextWindow = TextWindow

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_TextWindow"
local WIDTH, HEIGHT = 520, 380
local INSET = 12
local TITLE_HEIGHT = 30
local SCROLLBAR_WIDTH = 30
local BUTTON_WIDTH, BUTTON_HEIGHT = 140, 24
local NO_LETTER_LIMIT = 0

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
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, INSET + BUTTON_HEIGHT + INSET)
    local editBox = CreateFrame("EditBox", nil, scroll)
    editBox:SetMultiLine(true)
    editBox:SetMaxLetters(NO_LETTER_LIMIT)
    editBox:SetAutoFocus(false)
    editBox:SetFontObject(ChatFontNormal)
    editBox:SetWidth(WIDTH - INSET - SCROLLBAR_WIDTH * 2)
    editBox:SetScript("OnEscapePressed", function()
        frame:Hide()
    end)
    scroll:SetScrollChild(editBox)
    local button = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    button:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT", -INSET, INSET)
    frame.editBox, frame.button = editBox, button
    table.insert(UISpecialFrames, FRAME_NAME)
end

local function open(text)
    if frame == nil then
        create()
    end
    frame.editBox:SetText(text)
    frame:Show()
    frame.editBox:SetFocus()
end

--- Shows the text selected, ready for Ctrl+C.
function TextWindow.ShowCopy(text)
    open(text)
    frame.editBox:HighlightText()
    frame.button:SetText("Fermer")
    frame.button:SetScript("OnClick", function()
        frame:Hide()
    end)
end

--- Shows an empty box to paste a text into; the button (label) hands the text to confirm, which tells whether
--- it was taken: the window then closes.
function TextWindow.ShowPaste(label, confirm)
    open("")
    frame.button:SetText(label)
    frame.button:SetScript("OnClick", function()
        if confirm(frame.editBox:GetText()) then
            frame:Hide()
        end
    end)
end
