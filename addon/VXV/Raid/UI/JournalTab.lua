local ns = select(2, ...).Raid

--- The Journal screen (§7.7): an open accounts book, the guild's cash on the left page (to come with the bets),
--- the raids' records and the officers' changes on the right one.
local JournalTab = {}
ns.JournalTab = JournalTab

local JournalView, RaidData, RaidLog, RowList = ns.JournalView, ns.RaidData, ns.RaidLog, VXV.RowList

local Theme = VXV.Theme

local PADDING = 22
local BOOK_TOP = 80
local COVER = 14
local SPINE = 4
-- The spine's shadow on a page: strips of a growing width, darker by layers near the spine (pixel art, §3).
local SHADE_STRIPS, SHADE_STEP, SHADE_ALPHA = 4, 3, 0.07
-- The right page is 1.4 times as wide as the left one, as on the website.
local LEFT_SHARE = 1 / 2.4
-- A page is ruled from top to bottom, a line every RULE pixels. Each text is centred on its line, whose rule runs
-- under the text, at INK pixels from the line's top: the rows of the list too, which are a line high.
local RULE = RowList.RULE
local INK = RULE - 5
local PAGE_MARGIN = 14
local PAGE_PADDING = 22
-- The lines of a page: its title, its text, and on the right page the list from the fourth line.
local TEXT_LINE, LIST_LINE = 1, 3
-- The cash's lines come from the Paris part ("cash.updated"); without them, where they come from.
local CASH = { "La caisse arrive avec les paris :", "le compagnon VXV ou un officier les apporte." }
local INTRO = "Les raids enregistrés en jeu et les modifications des officiers, avec leur motif."

local content, list
local cashLines, cashTexts = {}, {}

local function render()
    list.SetRows(JournalView.Rows(RaidLog.All(), RaidData.Current()))
end

--- The top of a page's line, from 0.
local function lineTop(index)
    return PAGE_MARGIN + index * RULE
end

--- Writes a text on a line of the page, within its margins; returns it, to change its text.
local function write(page, index, text, style, size)
    local fontString = Theme.Text(page, style, size, "ink-brown")
    local y = -(lineTop(index) + RULE / 2)
    fontString:SetPoint("LEFT", page, "TOPLEFT", PAGE_PADDING, y)
    fontString:SetPoint("RIGHT", page, "TOPRIGHT", -PAGE_PADDING, y)
    fontString:SetWordWrap(false)
    fontString:SetText(text)
    return fontString
end

--- The cash's lines on the left page, as many as it holds.
local function renderCash()
    local texts = #cashTexts > 0 and cashTexts or CASH
    for index, fontString in ipairs(cashLines) do
        fontString:SetText(texts[index] or "")
    end
end

--- A parchment page of some lines on the cover, its title on the first one; the spine on one side. A child of the
--- cover, it lies a level above it: the game draws the textures of frames on the same level layer by layer, and the
--- leather would hide the parchment.
local function addPage(cover, x, width, height, lines, title, spineSide)
    local page = CreateFrame("Frame", nil, cover)
    page:SetPoint("TOPLEFT", x, -COVER)
    page:SetSize(width, height)
    Theme.Fill(page, "parchment"):SetAllPoints()
    for index = 0, lines - 1 do
        local rule = Theme.Fill(page, "ruling", "BORDER")
        rule:SetPoint("TOPLEFT", 0, -(lineTop(index) + INK))
        rule:SetPoint("TOPRIGHT", 0, -(lineTop(index) + INK))
        rule:SetHeight(1)
    end
    for strip = 1, SHADE_STRIPS do
        local shade = Theme.Fill(page, "leather-shade", "ARTWORK")
        shade:SetPoint("TOP" .. spineSide)
        shade:SetPoint("BOTTOM" .. spineSide)
        shade:SetWidth(strip * SHADE_STEP)
        shade:SetAlpha(SHADE_ALPHA)
    end
    write(page, 0, title, "pixelBold", 20)
    return page
end

function JournalTab.Build(frame)
    content = frame
    VXV.Screen.Head(content, nil, nil, "Journal")

    local width = content:GetWidth() - 2 * PADDING
    local height = content:GetHeight() - BOOK_TOP - PADDING
    local cover = CreateFrame("Frame", nil, content)
    cover:SetPoint("TOPLEFT", PADDING, -BOOK_TOP)
    cover:SetSize(width, height)
    Theme.Fill(cover, "leather"):SetAllPoints()
    Theme.Rings(cover, { { "ink", 2 }, { "copper", 3 } })

    local pages = width - 2 * COVER - SPINE
    local leftWidth = math.floor(pages * LEFT_SHARE)
    local pageHeight = height - 2 * COVER
    local lines = math.floor((pageHeight - 2 * PAGE_MARGIN) / RULE)
    local left = addPage(cover, COVER, leftWidth, pageHeight, lines, "La caisse", "RIGHT")
    for index = TEXT_LINE, lines - 1 do
        cashLines[#cashLines + 1] = write(left, index, "", "text", 12)
    end
    renderCash()

    local rightWidth = pages - leftWidth
    local right = addPage(cover, COVER + leftWidth + SPINE, rightWidth, pageHeight, lines, "Journal", "LEFT")
    write(right, TEXT_LINE, INTRO, "text", 12)
    -- The list fills the page's last lines: it scrolls by whole lines, its rows stay on the rules.
    local body = CreateFrame("Frame", nil, right)
    body:SetPoint("TOPLEFT", PAGE_PADDING, -lineTop(LIST_LINE))
    body:SetSize(rightWidth - 2 * PAGE_PADDING, (lines - LIST_LINE) * RULE)
    list = RowList.Create(body, 0, "parchment")
    VXV.Screen.Follow(content, render, { "raid.log", "raid.updated" })
end

VXV.On("cash.updated", function(texts)
    cashTexts = texts or {}
    if content ~= nil then
        renderCash()
    end
end)
