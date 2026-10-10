local ns = select(2, ...).Missions

--- The small parchments of the board (§7.4): a quest to come, pinned, with what counts and its reward; an ended
--- quest, faded under its stamp, with when it ended and who won it.
local QuestCards = {}
ns.QuestCards = QuestCards

local Parchment = ns.Parchment

local Theme = VXV.Theme

QuestCards.UPCOMING_HEIGHT, QuestCards.ENDED_HEIGHT = 58, 82
local PADDING_X = 14
local UPCOMING = { title = 12, line = 34 }
local ENDED = { when = 10, title = 25, line = 47 }

local function text(parent, style, size, color, width, top)
    local label = Theme.Text(parent, style, size, color)
    label:SetWidth(width)
    label:SetPoint("TOPLEFT", PADDING_X, -top)
    return label
end

--- A quest to come; card:Set({ title, line }).
function QuestCards.Upcoming(parent, width)
    local card = Parchment.Sheet(parent, width, QuestCards.UPCOMING_HEIGHT)
    Parchment.Pin(card)
    local inner = width - 2 * PADDING_X
    card.title = text(card, "pixelBold", 17, "parchment-ink", inner, UPCOMING.title)
    card.title:SetWordWrap(false)
    card.line = text(card, "text", 12, "parchment-text", inner, UPCOMING.line)
    card.line:SetWordWrap(false)
    function card:Set(quest)
        self.title:SetText(quest.title)
        self.line:SetText(quest.line)
    end
    return card
end

--- An ended quest; card:Set({ when, title, line, closed }).
function QuestCards.Ended(parent, width)
    local card = Parchment.Sheet(parent, width, QuestCards.ENDED_HEIGHT)
    card:SetFaded(true)
    local inner = width - 2 * PADDING_X
    card.when = text(card, "textHeavy", 10, "parchment-muted", inner, ENDED.when)
    card.title = text(card, "pixelBold", 16, "parchment-ink", inner, ENDED.title)
    card.title:SetWordWrap(false)
    card.line = text(card, "text", 12, "parchment-text", inner, ENDED.line)
    card.line:SetJustifyV("TOP")
    card.stamp = Parchment.Stamp(card)
    card.stamp:SetPoint("TOPRIGHT")
    function card:Set(quest)
        self.when:SetText(Theme.Upper(quest.when))
        self.title:SetText(quest.title)
        self.line:SetText(quest.line)
        self.stamp:Set(quest.closed)
    end
    return card
end
