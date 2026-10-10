local ns = select(2, ...).Core

--- A ranking board as the Ranking draws it (§7.5, docs/design/maquettes/AddonClassement.html), for every part that
--- ranks members (the Ranking's categories, the duels' Elo): the first three on banners hanging from a rod, the
--- records under them, and the following places with the player's own at the bottom. Each part is placed by the
--- screen and shows a view: { podium (the first three lines), rest (the others), mine (the player's line, or nil),
--- widest (the biggest value, for the bars), unit ("gold", "points" or "count"), metric, recordsTitle, records
--- ({ label, value, name, class }) }. A line: { rank, value, name, class, avatar, title }.
local RankingBoard = {}
ns.RankingBoard = RankingBoard

local Gold, Theme = ns.Gold, ns.Theme

local MEDIA = "Interface\\AddOns\\VXV\\Core\\Media\\"
local BANNER_WIDTH = 150
-- The places' metals and heights, first to third; the point takes this share of the height at the stripes.
local METALS = {
    { name = "OR", color = "gold", height = 330 },
    { name = "ARGENT", color = "silver", height = 300 },
    { name = "BRONZE", color = "bronze", height = 280 },
}
local STRIPE_INSET, STRIPE_WIDTH, STRIPE_SHARE = 8, 4, 0.985
local MEDAL, PORTRAIT, PORTRAIT_RING = 46, 72, 2
local TOP, BANNER_SPACE = 12, 6
local CARTOUCHE_PADDING, CARTOUCHE_HEIGHT = 8, 24
local ROD_HEIGHT, CAP_WIDTH, CAP_HEIGHT, RING_WIDTH, RING_HEIGHT, RING_INSET = 10, 14, 18, 10, 14, 26
local BANNER_GAP, BANNER_TOP = 18, 10
-- Second, first, third, as on a podium.
local PODIUM_ORDER = { 2, 1, 3 }
local RECORD_GAP, RECORD_PADDING = 8, 8
local ROW_HEIGHT, ROW_GAP, AVATAR, BAR_WIDTH, BAR_HEIGHT, VALUE_WIDTH, RANK_WIDTH = 42, 6, 32, 80, 6, 64, 24
local ROW_PADDING, ROW_SPACE, MINE_GAP = 8, 10, 16

--- A value as the board writes it: gold with its sign ("+3 215 po" on the banners, "+310" below), points with their
--- sign ("+24", "−10"), or a count.
function RankingBoard.Value(unit, value, withGold)
    if unit == "count" then
        return tostring(value)
    end
    return (unit == "gold" and withGold) and Gold.Signed(value) or Gold.SignedNumber(value)
end

--- The portrait's file, or nil without one.
function RankingBoard.Avatar(avatar)
    return avatar ~= nil and (MEDIA .. "Avatars\\" .. avatar .. ".png") or nil
end

--- A texture of the core's pixel art, sharp at any size (measured on 5 October).
local function texture(frame, file, layer)
    local image = frame:CreateTexture(nil, layer)
    image:SetTexture(file, nil, nil, "NEAREST")
    return image
end

--- A banner (§7.5): the cloth in the class color, cut in a point (Media/banner.png tinted, under the veil of
--- Media/cloth.png), two metal stripes, the place's name and medal, the portrait, the name, the title of the week and
--- the value in a black cartouche. The game does not turn frames: the banners do not sway as on the website.
local function createBanner(parent)
    local banner = CreateFrame("Frame", nil, parent)
    banner:SetWidth(BANNER_WIDTH)
    local cloth = texture(banner, MEDIA .. "banner.png", "BACKGROUND")
    cloth:SetAllPoints()
    texture(banner, MEDIA .. "cloth.png", "BORDER"):SetAllPoints()
    local stripes = {}
    for index, side in ipairs({ "LEFT", "RIGHT" }) do
        stripes[index] = banner:CreateTexture(nil, "ARTWORK")
        stripes[index]:SetPoint("TOP" .. side, banner, "TOP" .. side, index == 1 and STRIPE_INSET or -STRIPE_INSET, 0)
        stripes[index]:SetWidth(STRIPE_WIDTH)
    end
    local placeName = Theme.Text(banner, "textHeavy", 10, "banner-ink")
    placeName:SetPoint("TOP", 0, -TOP)
    local medal = CreateFrame("Frame", nil, banner)
    medal:SetSize(MEDAL, MEDAL)
    medal:SetPoint("TOP", placeName, "BOTTOM", 0, -BANNER_SPACE)
    local medalFill = medal:CreateTexture(nil, "ARTWORK")
    medalFill:SetAllPoints()
    Theme.Rings(medal, { { "ink", 2 } })
    local rank = Theme.Text(medal, "pixelBold", 26, "banner-ink")
    rank:SetPoint("CENTER")
    local portrait = CreateFrame("Frame", nil, banner)
    portrait:SetSize(PORTRAIT, PORTRAIT)
    portrait:SetPoint("TOP", medal, "BOTTOM", 0, -BANNER_SPACE - PORTRAIT_RING)
    Theme.Fill(portrait, "avatar-ground", "ARTWORK"):SetAllPoints()
    local picture = texture(portrait, nil, "OVERLAY")
    picture:SetAllPoints()
    local portraitRings = Theme.Rings(portrait, { { "ink", PORTRAIT_RING }, { "gold", PORTRAIT_RING } })
    local name = Theme.Text(banner, "pixelBold", 21, "banner-ink")
    name:SetPoint("TOP", portrait, "BOTTOM", 0, -BANNER_SPACE - PORTRAIT_RING)
    local title = Theme.Text(banner, "textHeavy", 11, "banner-title")
    title:SetPoint("TOP", name, "BOTTOM", 0, -BANNER_SPACE)
    local cartouche = CreateFrame("Frame", nil, banner)
    cartouche:SetHeight(CARTOUCHE_HEIGHT)
    cartouche:SetPoint("TOP", title, "BOTTOM", 0, -BANNER_SPACE)
    Theme.Fill(cartouche, "banner-ink", "ARTWORK"):SetAllPoints()
    local value = Theme.Text(cartouche, "pixelBold", 19, "ivory")
    value:SetPoint("CENTER")

    function banner:Set(place, line, unit)
        local metal = METALS[place]
        banner:SetHeight(metal.height)
        cloth:SetVertexColor(Theme.ClassColor(line.class))
        for _, stripe in ipairs(stripes) do
            stripe:SetColorTexture(Theme.Color(metal.color))
            stripe:SetHeight(metal.height * STRIPE_SHARE)
        end
        placeName:SetText(metal.name)
        medalFill:SetColorTexture(Theme.Color(metal.color))
        rank:SetText(line.rank)
        picture:SetTexture(RankingBoard.Avatar(line.avatar), nil, nil, "NEAREST")
        Theme.Recolor(portraitRings[2], metal.color)
        name:SetText((line.name:match("^(%S+)")))
        title:SetText(line.title ~= nil and ("◆ " .. line.title) or "")
        value:SetText(RankingBoard.Value(unit, line.value, true))
        cartouche:SetWidth(value:GetStringWidth() + 2 * CARTOUCHE_PADDING)
        banner:Show()
    end

    return banner
end

--- The podium at x, y of the content, width wide: the rod and its three banners. Returns { Set(view) }.
function RankingBoard.Podium(content, x, y, width)
    local rod = CreateFrame("Frame", nil, content)
    rod:SetPoint("TOPLEFT", x, -y)
    rod:SetSize(width, ROD_HEIGHT)
    Theme.Fill(rod, "beam"):SetAllPoints()
    Theme.Rings(rod, { { "ink", 2 } })
    for _, side in ipairs({ "LEFT", "RIGHT" }) do
        local cap = Theme.Fill(rod, "gold", "ARTWORK")
        cap:SetSize(CAP_WIDTH, CAP_HEIGHT)
        cap:SetPoint("TOP" .. side, rod, "TOP" .. side, 0, (CAP_HEIGHT - ROD_HEIGHT) / 2)
    end
    local banners = {}
    local podiumWidth = #PODIUM_ORDER * BANNER_WIDTH + (#PODIUM_ORDER - 1) * BANNER_GAP
    for column, place in ipairs(PODIUM_ORDER) do
        local banner = createBanner(content)
        banner:SetPoint("TOPLEFT", x + (width - podiumWidth) / 2 + (column - 1) * (BANNER_WIDTH + BANNER_GAP),
            -y - BANNER_TOP)
        for _, side in ipairs({ "LEFT", "RIGHT" }) do
            local ring = Theme.Fill(banner, "copper", "OVERLAY")
            ring:SetSize(RING_WIDTH, RING_HEIGHT)
            ring:SetPoint("TOP" .. side, banner, "TOP" .. side, side == "LEFT" and RING_INSET or -RING_INSET,
                BANNER_TOP)
        end
        banners[place] = banner
    end

    local podium = {}
    function podium.Set(view)
        for place, banner in ipairs(banners) do
            local line = view.podium[place]
            if line == nil then
                banner:Hide()
            else
                banner:Set(place, line, view.unit)
            end
        end
    end
    return podium
end

--- The records' panel at x, y of the content: three boxes, label, value and holder. Returns { Set(view) }.
function RankingBoard.Records(content, x, y, width, height)
    local _, body, title = Theme.TitledPanel(content, x, y, width, height, "")
    local boxWidth = (body:GetWidth() - 2 * RECORD_GAP) / 3
    local boxes = {}
    for index = 1, 3 do
        local box = CreateFrame("Frame", nil, body)
        box:SetPoint("TOPLEFT", (index - 1) * (boxWidth + RECORD_GAP), 0)
        box:SetSize(boxWidth, body:GetHeight())
        local ground = Theme.Fill(box, "night")
        ground:SetAllPoints()
        ground:SetAlpha(0.55)
        Theme.Rings(box, { { "line", 1 } }, true)
        box.label = Theme.Text(box, "textHeavy", 10, "muted")
        box.label:SetPoint("TOPLEFT", RECORD_PADDING, -RECORD_PADDING)
        box.value = Theme.Text(box, "pixelBold", 17, "gold")
        box.value:SetPoint("TOPLEFT", box.label, "BOTTOMLEFT", 0, -4)
        box.who = Theme.Text(box, "textBold", 12, "lavender")
        box.who:SetPoint("TOPLEFT", box.value, "BOTTOMLEFT", 0, -4)
        boxes[index] = box
    end

    local records = {}
    function records.Set(view)
        title:SetText(view.recordsTitle)
        for index, box in ipairs(boxes) do
            local record = view.records[index]
            box:SetShown(record ~= nil)
            if record ~= nil then
                box.label:SetText(Theme.Upper(record.label))
                box.value:SetText(record.value)
                box.who:SetText(Theme.ClassColored(record.name, record.class))
            end
        end
    end
    return records
end

--- A place below the podium: rank, portrait in a ring of its class color, name and title, bar, value.
local function createRow(parent, own)
    local row = CreateFrame("Frame", nil, parent)
    row:SetHeight(ROW_HEIGHT)
    row.background = row:CreateTexture(nil, "BACKGROUND")
    row.background:SetAllPoints()
    row.ring = Theme.Rings(row, { { own and "amethyst" or "line", own and 2 or 1 } }, true)[1]
    row.rank = Theme.Text(row, "pixel", 15, own and "amethyst-light" or "muted")
    row.rank:SetPoint("LEFT", ROW_PADDING, 0)
    row.avatar = CreateFrame("Frame", nil, row)
    row.avatar:SetSize(AVATAR, AVATAR)
    row.avatar:SetPoint("LEFT", ROW_PADDING + RANK_WIDTH + ROW_SPACE, 0)
    Theme.Fill(row.avatar, "avatar-ground", "ARTWORK"):SetAllPoints()
    row.picture = row.avatar:CreateTexture(nil, "OVERLAY")
    row.picture:SetAllPoints()
    row.frame = Theme.Rings(row.avatar, { { "line", 2 } })[1]
    row.value = Theme.Text(row, "pixel", 15, "gain")
    row.value:SetPoint("RIGHT", -ROW_PADDING, 0)
    row.value:SetWidth(VALUE_WIDTH)
    row.value:SetJustifyH("RIGHT")
    row.bar = row:CreateTexture(nil, "ARTWORK")
    row.bar:SetSize(BAR_WIDTH, BAR_HEIGHT)
    row.bar:SetPoint("RIGHT", row.value, "LEFT", -ROW_SPACE, 0)
    row.bar:SetColorTexture(Theme.Color("line"))
    row.fill = row:CreateTexture(nil, "OVERLAY")
    row.fill:SetHeight(BAR_HEIGHT)
    row.fill:SetPoint("LEFT", row.bar, "LEFT")
    row.name = Theme.Text(row, "textBold", 14, "ivory")
    row.name:SetPoint("TOPLEFT", row.avatar, "TOPRIGHT", ROW_SPACE, 0)
    row.name:SetPoint("RIGHT", row.bar, "LEFT", -ROW_SPACE, 0)
    row.title = Theme.Text(row, "text", 11, own and "muted" or "sakura-light")
    row.title:SetPoint("BOTTOMLEFT", row.avatar, "BOTTOMRIGHT", ROW_SPACE, 0)

    function row:Set(line, view, index)
        local positive = line.value >= 0
        row.background:SetColorTexture(Theme.Color(own and "amethyst" or (index % 2 == 1 and "amethyst" or "night")))
        row.background:SetAlpha(own and 0.16 or (index % 2 == 1 and 0.06 or 0.4))
        row.rank:SetText(line.rank)
        row.picture:SetTexture(RankingBoard.Avatar(line.avatar), nil, nil, "NEAREST")
        Theme.Recolor(row.frame, "line")
        if line.class ~= nil then
            for _, edge in ipairs(row.frame) do
                edge:SetColorTexture(Theme.ClassColor(line.class))
            end
        end
        local name = Theme.ClassColored(line.name, line.class)
        row.name:SetText(own and ("Toi · " .. name) or name)
        row.title:SetText(own and "ta position" or (line.title ~= nil and ("◆ " .. line.title) or ""))
        local share = view.widest > 0 and math.abs(line.value) / view.widest or 0
        row.fill:SetWidth(math.max(1, BAR_WIDTH * share))
        row.fill:SetColorTexture(Theme.Color(positive and "gain" or "loss"))
        row.value:SetTextColor(Theme.Color(positive and "gain" or "loss"))
        row.value:SetText(RankingBoard.Value(view.unit, line.value, false))
        row:Show()
    end

    return row
end

--- The following places' panel at x, y of the content, scrolled with the wheel, the player's own at the bottom, the
--- view's metric on the right of its title. Returns { Set(view) }, which shows a view from its top.
function RankingBoard.Rest(content, x, y, width, height, title)
    local panel, body = Theme.TitledPanel(content, x, y, width, height, title or "Suite du classement")
    local metric = Theme.Text(panel, "textBold", 11, "muted")
    metric:SetPoint("TOPRIGHT", -Theme.PANEL_PADDING, -Theme.PANEL_PADDING)
    local mine = createRow(body, true)
    mine:SetPoint("BOTTOMLEFT")
    mine:SetPoint("BOTTOMRIGHT")
    local rows = {}
    local visible = math.max(1,
        math.floor((body:GetHeight() - ROW_HEIGHT - MINE_GAP + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)))
    for index = 1, visible do
        local row = createRow(body, false)
        row:SetPoint("TOPLEFT", 0, -(index - 1) * (ROW_HEIGHT + ROW_GAP))
        row:SetPoint("RIGHT")
        rows[index] = row
    end

    local rest, shown, offset = {}, nil, 0
    --- The places from the offset the wheel reached.
    local function render()
        offset = math.max(0, math.min(offset, #shown.rest - #rows))
        for index, row in ipairs(rows) do
            local line = shown.rest[offset + index]
            if line == nil then
                row:Hide()
            else
                row:Set(line, shown, offset + index)
            end
        end
        if shown.mine == nil then
            mine:Hide()
        else
            mine:Set(shown.mine, shown, 1)
        end
    end
    body:EnableMouseWheel(true)
    body:SetScript("OnMouseWheel", function(_, delta)
        if shown ~= nil then
            offset = offset - delta
            render()
        end
    end)

    function rest.Set(view)
        shown, offset = view, 0
        metric:SetText(view.metric)
        render()
    end
    return rest
end
