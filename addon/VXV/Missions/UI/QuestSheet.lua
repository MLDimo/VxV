local ns = select(2, ...).Missions

--- A quest on its parchment pinned to the board (§7.4, docs/design/maquettes/AddonMissions.html): kicker and title
--- beside the guild's seal, what the guild rewards, the reward split, the first five with the player's line, the
--- player's progress toward the podium, and the rules of the score at the bottom.
local QuestSheet = {}
ns.QuestSheet = QuestSheet

local Parchment = ns.Parchment

local Theme = VXV.Theme

local PADDING_X, PADDING_TOP, PADDING_BOTTOM = 20, 18, 14
-- Beside the seal: the kicker runs above its round top, the title keeps clear of it on two lines at most.
local KICKER_ROOM, SEAL_ROOM = 60, 82
local TITLE_TOP, TITLE_HEIGHT = 32, 64
local PITCH_TOP, PITCH_HEIGHT = 100, 50
-- The first three share the reward.
local PRIZES = 3
local PRIZES_TOP, PRIZE_HEIGHT, PRIZE_GAP, PRIZE_LABEL_TOP, PRIZE_GOLD_TOP = 160, 40, 8, 6, 19
local LEAD_TOP, LEAD_ROWS, ROW_HEIGHT, ROW_GAP, ROW_PADDING = 210, 5, 24, 3, 6
local RANK_WIDTH, BAR_WIDTH, BAR_HEIGHT, SCORE_WIDTH, CELL_GAP = 18, 110, 6, 36, 10
local PROGRESS_TOP, PROGRESS_HEIGHT, PROGRESS_PADDING, PROGRESS_TEXT_TOP, PLACE_WIDTH = 352, 58, 12, 24, 50
local FOOTER_TEXT, FOOTER_GAP = 26, 8
-- Under the seal, the stamp of a quest accomplished.
local STAMP_TOP = 88
local MINE_ALPHA, TRACK_ALPHA = 0.14, 0.22
local PRIZE_FILL, PRIZE_EDGE, PROGRESS_FILL, PROGRESS_EDGE, FOOTER_ALPHA = 0.12, 0.4, 0.1, 0.4, 0.45

local function text(parent, style, size, color, width)
    local label = Theme.Text(parent, style, size, color)
    if width ~= nil then
        label:SetWidth(width)
    end
    return label
end

local function addPrizes(sheet, inner)
    local width = (inner - (PRIZES - 1) * PRIZE_GAP) / PRIZES
    for index = 1, PRIZES do
        local prize = Parchment.Box(sheet, "parchment-muted", PRIZE_FILL, PRIZE_EDGE)
        prize:SetSize(width, PRIZE_HEIGHT)
        prize:SetPoint("TOPLEFT", PADDING_X + (index - 1) * (width + PRIZE_GAP), -PRIZES_TOP)
        prize.label = text(prize, "textHeavy", 10, "parchment-muted")
        prize.label:SetPoint("TOP", 0, -PRIZE_LABEL_TOP)
        prize.gold = text(prize, "pixelBold", 17, "stamp-cash")
        prize.gold:SetPoint("TOP", 0, -PRIZE_GOLD_TOP)
        sheet.prizes[index] = prize
    end
end

--- A line of the ranking: place, name, bar to the best score, score.
local function addLeadRow(sheet, index, inner)
    local line = CreateFrame("Frame", nil, sheet)
    line:SetSize(inner, ROW_HEIGHT)
    line:SetPoint("TOPLEFT", PADDING_X, -(LEAD_TOP + (index - 1) * (ROW_HEIGHT + ROW_GAP)))
    local r, g, b = Theme.Color("stamp-loot")
    line.mine = line:CreateTexture(nil, "BACKGROUND")
    line.mine:SetAllPoints()
    line.mine:SetColorTexture(r, g, b, MINE_ALPHA)
    line.rank = text(line, "pixel", 13, "parchment-muted")
    line.rank:SetPoint("LEFT", ROW_PADDING, 0)
    line.score = text(line, "pixel", 13, "parchment-ink", SCORE_WIDTH)
    line.score:SetPoint("RIGHT", -ROW_PADDING, 0)
    line.score:SetJustifyH("RIGHT")
    local track = line:CreateTexture(nil, "ARTWORK")
    track:SetSize(BAR_WIDTH, BAR_HEIGHT)
    track:SetPoint("RIGHT", -(ROW_PADDING + SCORE_WIDTH + CELL_GAP), 0)
    local tr, tg, tb = Theme.Color("parchment-muted")
    track:SetColorTexture(tr, tg, tb, TRACK_ALPHA)
    line.bar = Theme.Fill(line, "stamp-loot", "OVERLAY")
    line.bar:SetHeight(BAR_HEIGHT)
    line.bar:SetPoint("LEFT", track, "LEFT")
    local nameLeft = ROW_PADDING + RANK_WIDTH + CELL_GAP
    line.name = text(line, "textBold", 13, "parchment-ink",
        inner - nameLeft - ROW_PADDING - SCORE_WIDTH - BAR_WIDTH - 2 * CELL_GAP)
    line.name:SetPoint("LEFT", nameLeft, 0)
    line.name:SetWordWrap(false)
    sheet.lead[index] = line
end

local function addProgress(sheet, inner)
    local box = Parchment.Box(sheet, "stamp-loot", PROGRESS_FILL, PROGRESS_EDGE)
    box:SetSize(inner, PROGRESS_HEIGHT)
    box:SetPoint("TOPLEFT", PADDING_X, -PROGRESS_TOP)
    local heading = text(box, "textHeavy", 10, "stamp-loot")
    heading:SetPoint("TOPLEFT", PROGRESS_PADDING, -PROGRESS_PADDING)
    heading:SetText(Theme.Upper("Ta progression"))
    box.text = text(box, "text", 13, "parchment-ink", inner - 2 * PROGRESS_PADDING - PLACE_WIDTH)
    box.text:SetPoint("TOPLEFT", PROGRESS_PADDING, -PROGRESS_TEXT_TOP)
    box.text:SetJustifyV("TOP")
    box.place = text(box, "pixelBold", 22, "stamp-loot")
    box.place:SetPoint("RIGHT", -PROGRESS_PADDING, 0)
    box.place:SetJustifyH("RIGHT")
    sheet.progress = box
end

local function addFooter(sheet, inner)
    local line = Parchment.Dashes(sheet, "parchment-muted", FOOTER_ALPHA, inner)
    line:SetPoint("BOTTOMLEFT", PADDING_X, PADDING_BOTTOM + FOOTER_TEXT + FOOTER_GAP)
    local half = (inner - CELL_GAP) / 2
    for index, words in ipairs({ "Égalité : le premier à atteindre le score", "Score relevé à chaque connexion" }) do
        local label = text(sheet, "text", 11, "parchment-muted", half)
        label:SetPoint("TOPLEFT", line, "BOTTOMLEFT", (index - 1) * (half + CELL_GAP), -FOOTER_GAP)
        label:SetJustifyV("TOP")
        label:SetText(words)
    end
end

--- Shows a quest's sheet (QuestsView.Sheet).
local function set(sheet, view)
    sheet.kicker:SetText(Theme.Upper(view.kicker))
    sheet.title:SetText(view.title)
    sheet.pitch:SetText(view.pitch)
    sheet.stamp:SetShown(view.closed)
    sheet:SetFaded(view.closed)
    for index, prize in ipairs(sheet.prizes) do
        prize.label:SetText(view.prizes[index].label)
        prize.gold:SetText(view.prizes[index].gold)
    end
    for index, line in ipairs(sheet.lead) do
        local entry = view.lead[index]
        line:SetShown(entry ~= nil)
        if entry ~= nil then
            line.mine:SetShown(entry.mine)
            line.rank:SetText(tostring(entry.rank))
            line.name:SetText(entry.mine and Theme.Colored(entry.name, "stamp-loot")
                or Theme.ParchmentClassColored(entry.name, entry.class))
            line.score:SetText(tostring(entry.score))
            line.bar:SetShown(entry.share > 0)
            line.bar:SetWidth(math.max(1, BAR_WIDTH * entry.share))
        end
    end
    sheet.empty:SetText(view.empty or "")
    sheet.progress.text:SetText(view.progress.text)
    sheet.progress.place:SetText(view.progress.place)
end

--- A quest's sheet of this size, to place; sheet:Set(view) shows a quest.
function QuestSheet.New(parent, width, height)
    local sheet = Parchment.Sheet(parent, width, height)
    local inner = width - 2 * PADDING_X
    Parchment.Pin(sheet)
    Parchment.Seal(sheet, PADDING_X, PADDING_TOP)
    sheet.stamp = Parchment.Stamp(sheet)
    sheet.stamp:Set(true)
    sheet.stamp:SetPoint("TOPRIGHT", 0, -STAMP_TOP)
    sheet.kicker = text(sheet, "textHeavy", 10, "stamp-loot", inner - KICKER_ROOM)
    sheet.kicker:SetPoint("TOPLEFT", PADDING_X, -PADDING_TOP)
    sheet.kicker:SetWordWrap(false)
    sheet.title = text(sheet, "pixelBold", 26, "parchment-ink", inner - SEAL_ROOM)
    sheet.title:SetPoint("TOPLEFT", PADDING_X, -TITLE_TOP)
    sheet.title:SetHeight(TITLE_HEIGHT)
    sheet.title:SetJustifyV("TOP")
    sheet.pitch = text(sheet, "text", 13, "parchment-text", inner)
    sheet.pitch:SetPoint("TOPLEFT", PADDING_X, -PITCH_TOP)
    sheet.pitch:SetHeight(PITCH_HEIGHT)
    sheet.pitch:SetJustifyV("TOP")
    sheet.prizes, sheet.lead = {}, {}
    addPrizes(sheet, inner)
    for index = 1, LEAD_ROWS do
        addLeadRow(sheet, index, inner)
    end
    sheet.empty = text(sheet, "text", 13, "parchment-text", inner)
    sheet.empty:SetPoint("TOPLEFT", PADDING_X, -LEAD_TOP)
    addProgress(sheet, inner)
    addFooter(sheet, inner)
    sheet.Set = set
    return sheet
end
