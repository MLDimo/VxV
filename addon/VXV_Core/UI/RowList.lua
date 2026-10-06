local _, ns = ...

--- A list of text rows in the charter's fonts, scrolled with the mouse wheel; shared by the bundles' screens, the
--- reduced mode and the dialogs (VXV.RowList). A row is { kind = "title" | "header" | "line" | "bar" | "card",
--- text, tooltip = { title, lines } or link = item link for the game's item tooltip, onClick, stamp = { text,
--- color } }; a bar is { kind = "bar", share between 0 and 1, color = a token }; a card is a block with its text
--- and a detail line under it.
local RowList = {}
ns.RowList = RowList

local Bus, Theme, Tooltip = ns.Bus, ns.Theme, ns.Tooltip

-- Palettes: the dark panels of the screens, and the parchment of the accounts book (§7.7), whose rows all sit on
-- the page's lines.
local RULE = 24
RowList.RULE = RULE
local PALETTES = {
    panel = {
        heights = { title = 24, header = 22, line = 18, bar = 8, card = 58 },
        fonts = { title = { "pixelBold", 18, "ivory" }, header = { "pixel", 15, "ivory" },
            line = { "text", 13, "lavender" }, card = { "textBold", 15, "ivory" } },
        step = 40,
    },
    parchment = {
        heights = { title = RULE, header = RULE, line = RULE, bar = RULE },
        fonts = { title = { "pixelBold", 18, "ink-brown" }, header = { "textBold", 13, "ink-brown" },
            line = { "text", 13, "ink-brown" } },
        step = 2 * RULE,
    },
}
local BAR_HEIGHT = 4
local STAMP_HEIGHT, STAMP_PADDING, STAMP_GAP, STAMP_BORDER = 14, 8, 6, 1
-- A card: its block, the space under it, and its text's margins.
local CARD_GAP, CARD_PADDING, CARD_TEXT_TOP, CARD_DETAIL_TOP = 6, 12, -9, -31

local function showTooltip(frame)
    local row = frame.row
    if row.link ~= nil then
        Tooltip.ShowLink(frame, "ANCHOR_RIGHT", row.link)
    elseif row.tooltip ~= nil then
        Tooltip.Show(frame, "ANCHOR_RIGHT", row.tooltip.title, row.tooltip.lines)
    end
end

local function click(frame)
    if frame.row.onClick ~= nil then
        frame.row.onClick()
    end
end

--- The stamp in front of a row (§7.7): its category in its ink, framed.
local function addStamp(frame)
    local stamp = CreateFrame("Frame", nil, frame)
    stamp:SetPoint("LEFT")
    stamp:SetHeight(STAMP_HEIGHT)
    stamp.ring = Theme.Rings(stamp, { { "ink-brown", STAMP_BORDER } }, true)[1]
    stamp.label = Theme.Text(stamp, "textHeavy", 10, "ink-brown")
    stamp.label:SetPoint("CENTER")
    return stamp
end

--- A card's block behind its text, and its detail line.
local function showCard(frame, row)
    local isCard = row.kind == "card"
    frame.block:SetShown(isCard)
    frame.detail:SetShown(isCard)
    frame.detail:SetText(isCard and row.detail or "")
    if isCard then
        frame.label:ClearAllPoints()
        frame.label:SetPoint("TOPLEFT", CARD_PADDING, CARD_TEXT_TOP)
        frame.label:SetPoint("RIGHT", -CARD_PADDING, 0)
    end
    return isCard
end

local function showStamp(frame, stamp)
    frame.stamp:SetShown(stamp ~= nil)
    frame.label:ClearAllPoints()
    frame.label:SetPoint("RIGHT")
    if stamp == nil then
        frame.label:SetPoint("LEFT")
        return
    end
    Theme.Recolor(frame.stamp.ring, stamp.color)
    frame.stamp.label:SetTextColor(Theme.Color(stamp.color))
    frame.stamp.label:SetText(stamp.text)
    frame.stamp:SetWidth(frame.stamp.label:GetStringWidth() + STAMP_PADDING)
    frame.label:SetPoint("LEFT", frame.stamp, "RIGHT", STAMP_GAP, 0)
end

--- Fills the parent frame (whose size is set) below topOffset with a list in a palette ("panel" by default, or
--- "parchment"); returns the list, to give it rows.
function RowList.Create(parent, topOffset, paletteName)
    local palette = PALETTES[paletteName or "panel"]
    local scroll = CreateFrame("ScrollFrame", nil, parent)
    scroll:SetPoint("TOPLEFT", 0, -(topOffset or 0))
    scroll:SetPoint("BOTTOMRIGHT")
    local width = parent:GetWidth()
    local content = CreateFrame("Frame", nil, scroll)
    content:SetWidth(width)
    scroll:SetScrollChild(content)
    scroll:EnableMouseWheel(true)
    scroll:SetScript("OnMouseWheel", function(_, delta)
        local range = math.max(0, content:GetHeight() - scroll:GetHeight())
        scroll:SetVerticalScroll(math.min(range, math.max(0, scroll:GetVerticalScroll() - delta * palette.step)))
    end)
    local frames = {}

    local function newRow()
        local frame = CreateFrame("Frame", nil, content)
        frame:SetWidth(width)
        frame:EnableMouse(true)
        frame:SetScript("OnEnter", showTooltip)
        frame:SetScript("OnLeave", Tooltip.Hide)
        frame:SetScript("OnMouseUp", click)
        frame.label = Theme.Text(frame, "text", 13, "lavender")
        frame.label:SetWordWrap(false)
        frame.stamp = addStamp(frame)
        frame.block = Theme.Fill(frame, "card")
        frame.block:SetPoint("TOPLEFT")
        frame.block:SetPoint("BOTTOMRIGHT", 0, CARD_GAP)
        frame.detail = Theme.Text(frame, "text", 13, "lavender")
        frame.detail:SetPoint("TOPLEFT", CARD_PADDING, CARD_DETAIL_TOP)
        frame.detail:SetPoint("RIGHT", -CARD_PADDING, 0)
        frame.detail:SetWordWrap(false)
        frame.bar = Theme.Fill(frame, "line", "ARTWORK")
        frame.bar:SetPoint("LEFT")
        frame.bar:SetHeight(BAR_HEIGHT)
        frames[#frames + 1] = frame
        return frame
    end

    local list = {}
    --- Shows these rows, reusing the row frames; from the top, unless keepScroll (a row changed in place).
    function list.SetRows(rows, keepScroll)
        local top = 0
        for index, row in ipairs(rows) do
            local frame = frames[index] or newRow()
            local height = palette.heights[row.kind]
            frame:SetHeight(height)
            frame:ClearAllPoints()
            frame:SetPoint("TOPLEFT", 0, -top)
            top = top + height
            if not showCard(frame, row) then
                showStamp(frame, row.stamp)
            end
            if row.kind == "bar" then
                frame.label:SetText("")
                frame.bar:SetColorTexture(Theme.Color(row.color or "line"))
                frame.bar:SetWidth(math.max(1, width * row.share))
                frame.bar:Show()
            else
                local font = palette.fonts[row.kind]
                frame.label:SetFontObject(Theme.Font(font[1], font[2]))
                frame.label:SetTextColor(Theme.Color(font[3]))
                frame.label:SetText(row.text)
                frame.bar:Hide()
            end
            frame.row = row
            frame:Show()
        end
        for index = #rows + 1, #frames do
            frames[index]:Hide()
        end
        content:SetHeight(top)
        if not keepScroll then
            scroll:SetVerticalScroll(0)
        end
    end
    return list
end

--- A titled panel of a screen's grid holding a list (Theme.TitledPanel, whose style also picks the palette);
--- returns the list.
function RowList.Panel(parent, x, y, width, height, title, style)
    local _, body = Theme.TitledPanel(parent, x, y, width, height, title, style)
    return RowList.Create(body, 0, style == "parchment" and "parchment" or nil)
end

--- Fills a frame, within a margin, with a list of rows() shown each time the frame shows and after each of the bus
--- events: the simple tabs of the reduced mode. Returns the list.
function RowList.Fill(frame, margin, rows, events)
    local body = CreateFrame("Frame", nil, frame)
    body:SetPoint("TOPLEFT", margin, -margin)
    body:SetSize(frame:GetWidth() - 2 * margin, frame:GetHeight() - 2 * margin)
    local list = RowList.Create(body)
    local function render()
        list.SetRows(rows())
    end
    frame:SetScript("OnShow", render)
    for _, event in ipairs(events) do
        Bus.On(event, render)
    end
    render()
    return list
end
