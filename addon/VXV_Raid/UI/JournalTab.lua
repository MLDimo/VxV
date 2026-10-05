local _, ns = ...

--- The Journal screen (§7.7): an open accounts book, the guild's cash on the left page (to come with the bets),
--- the raids' records and the officers' changes on the right one.
local JournalTab = {}
ns.JournalTab = JournalTab

local JournalView, RaidData, RaidLog, RowList = ns.JournalView, ns.RaidData, ns.RaidLog, ns.RowList

local Theme = VXV.Theme

local PADDING = 22
local BOOK_TOP = 80
local COVER = 14
local SPINE, SPINE_SHADOW, SPINE_ALPHA = 4, 18, 0.35
-- The right page is 1.4 times as wide as the left one, as on the website.
local LEFT_SHARE = 1 / 2.4
local PAGE_PADDING = 22
local PAGE_HEAD = 64

local content, list

local function render()
    list.SetRows(JournalView.Rows(RaidLog.All(), RaidData.Current()))
end

--- A parchment page on the cover, its title and its lines every RULE pixels; the spine on one side. A child of
--- the cover, it lies a level above it: the game draws the textures of frames on the same level layer by layer,
--- and the leather would hide the parchment.
local function addPage(cover, x, width, height, title, spineSide)
    local page = CreateFrame("Frame", nil, cover)
    page:SetPoint("TOPLEFT", x, -COVER)
    page:SetSize(width, height)
    Theme.Fill(page, "parchment"):SetAllPoints()
    for y = PAGE_HEAD + RowList.RULE, height - PAGE_PADDING, RowList.RULE do
        local rule = Theme.Fill(page, "ruling", "BORDER")
        rule:SetPoint("TOPLEFT", 0, -y)
        rule:SetPoint("TOPRIGHT", 0, -y)
        rule:SetHeight(1)
    end
    local shadow = Theme.Fill(page, "leather-shade", "BORDER")
    shadow:SetPoint("TOP" .. spineSide)
    shadow:SetPoint("BOTTOM" .. spineSide)
    shadow:SetWidth(SPINE_SHADOW)
    shadow:SetAlpha(SPINE_ALPHA)
    local heading = Theme.Text(page, "pixelBold", 20, "ink-brown")
    heading:SetPoint("TOPLEFT", PAGE_PADDING, -PAGE_PADDING)
    heading:SetText(title)
    return page
end

function JournalTab.Build(frame)
    content = frame
    local _, title = Theme.ScreenHeader(content, nil, nil, "Journal")
    title:ClearAllPoints()
    title:SetPoint("TOPLEFT", PADDING, -PADDING)

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
    local left = addPage(cover, COVER, leftWidth, pageHeight, "La caisse", "RIGHT")
    local soon = Theme.Text(left, "text", 13, "ink-brown")
    soon:SetPoint("TOPLEFT", PAGE_PADDING, -PAGE_HEAD)
    soon:SetText("Bientôt : dons, dettes et caisse de la guilde, avec les paris.")

    local rightWidth = pages - leftWidth
    local right = addPage(cover, COVER + leftWidth + SPINE, rightWidth, pageHeight, "Journal", "LEFT")
    local intro = Theme.Text(right, "text", 12, "ink-brown")
    intro:SetPoint("TOPLEFT", PAGE_PADDING, -(PAGE_PADDING + 26))
    intro:SetText("Les raids enregistrés en jeu et les modifications des officiers, avec leur motif.")
    -- The list's height is a whole number of lines, so that its rows stay on the page's lines when it scrolls.
    local lines = math.floor((pageHeight - PAGE_HEAD - PAGE_PADDING) / RowList.RULE)
    local body = CreateFrame("Frame", nil, right)
    body:SetPoint("TOPLEFT", PAGE_PADDING, -PAGE_HEAD)
    body:SetSize(rightWidth - 2 * PAGE_PADDING, lines * RowList.RULE)
    list = RowList.Create(body, 0, "parchment")
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("raid.log", refresh)
VXV.On("raid.updated", refresh)
