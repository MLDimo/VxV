local _, ns = ...

--- A message in the middle of the screen (P8.3), as the game's raid warnings, in the charter: the alert's background
--- with a gold ring. It fades away after a few seconds and catches no click.
local AlertFrame = {}
ns.AlertFrame = AlertFrame

local Theme = VXV.Theme

local WIDTH, HEIGHT, TOP = 560, 78, -150
local TITLE_TOP, TEXT_GAP = 14, 8
local SHOWN_SECONDS = 8

local frame
local shownAt = 0

local function build()
    frame = CreateFrame("Frame", "VXV_BossAlert", UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    frame:SetPoint("TOP", 0, TOP)
    -- Over the windows (HIGH strata), as the dialogs: the alert stays seen with the window open.
    frame:SetFrameStrata("DIALOG")
    frame:EnableMouse(false)
    Theme.Fill(frame, "alert"):SetAllPoints()
    Theme.Rings(frame, { { "ink", 2 }, { "gold", 2 } })
    frame.title = Theme.Text(frame, "pixelBold", 20, "gold")
    frame.title:SetPoint("TOP", 0, -TITLE_TOP)
    frame.text = Theme.Text(frame, "text", 14, "ivory")
    frame.text:SetPoint("TOP", frame.title, "BOTTOM", 0, -TEXT_GAP)
end

--- Shows the message for a few seconds; a newer one replaces it.
function AlertFrame.Show(title, text)
    if frame == nil then
        build()
    end
    frame.title:SetText(title)
    frame.text:SetText(text)
    frame:Show()
    shownAt = shownAt + 1
    local mine = shownAt
    C_Timer.After(SHOWN_SECONDS, function()
        if shownAt == mine then
            frame:Hide()
        end
    end)
end
