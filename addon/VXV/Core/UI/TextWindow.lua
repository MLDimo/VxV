local ns = select(2, ...).Core

--- A window holding a text: shown selected, ready to copy (Ctrl+C), or empty, to paste into and confirm.
local TextWindow = {}
ns.TextWindow = TextWindow

local Dialog, Theme = ns.Dialog, ns.Theme

local FRAME_NAME = "VXV_TextWindow"
local WIDTH, HEIGHT = 520, 380
local GAP = 12
-- The game's scroll frame keeps the box's cursor in view while typing; its scroll bar needs this room.
local SCROLLBAR_WIDTH = 26
local BUTTON_WIDTH, BUTTON_HEIGHT = 150, 28
local NO_LETTER_LIMIT = 0

local frame

local function create()
    local body
    frame, body = Dialog.Create(FRAME_NAME, WIDTH, HEIGHT, "VXV")
    local field = CreateFrame("Frame", nil, body)
    field:SetPoint("TOPLEFT")
    field:SetSize(body:GetWidth(), body:GetHeight() - BUTTON_HEIGHT - GAP)
    Theme.Fill(field, "night"):SetAllPoints()
    Theme.Rings(field, { { "line", 1 } })
    local scroll = CreateFrame("ScrollFrame", nil, field, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", GAP / 2, -GAP / 2)
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, GAP / 2)
    local editBox = CreateFrame("EditBox", nil, scroll)
    editBox:SetMultiLine(true)
    editBox:SetMaxLetters(NO_LETTER_LIMIT)
    editBox:SetAutoFocus(false)
    editBox:SetFontObject(ChatFontNormal)
    editBox:SetWidth(field:GetWidth() - SCROLLBAR_WIDTH - GAP)
    editBox:SetScript("OnEscapePressed", function()
        frame:Hide()
    end)
    scroll:SetScrollChild(editBox)
    local button = Theme.Button(body, "pixel", "", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    frame.editBox, frame.button = editBox, button
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
