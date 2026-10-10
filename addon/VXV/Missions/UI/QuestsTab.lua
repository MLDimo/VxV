local ns = select(2, ...).Missions

--- The Quêtes screen (§7.4, docs/design/maquettes/AddonMissions.html): the quest pinned on its parchment, the
--- quests to come and the ended ones on small parchments, the hall of fame in its gold frame and the officers' zone.
local QuestsTab = {}
ns.QuestsTab = QuestsTab

local HallOfFame, Parchment, QuestCards, QuestDialog = ns.HallOfFame, ns.Parchment, ns.QuestCards, ns.QuestDialog
local QuestSheet, QuestsData, QuestsView = ns.QuestSheet, ns.QuestsData, ns.QuestsView
local Screen, Theme = VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local PANEL_PADDING, PANEL_TITLE = Theme.PANEL_PADDING, 40
-- The grid of the mockup: 1.25fr | 1fr | 230px.
local BOARD_SHARE, RIGHT = 1.25 / 2.25, 230
local CARD_GAP, FAME_GAP = 10, 8
local TO_COME_HEIGHT = PANEL_TITLE + QuestCards.UPCOMING_HEIGHT + PANEL_PADDING
local OFFICER_HEIGHT, OFFICER_BUTTON = 90, 36
local NOTE_TOP, NO_QUEST_HEIGHT = 15, 90

local parts = {}

local function render()
    local data, now = QuestsData.Current(), time()
    parts.head.subtitle:SetText(QuestsView.Subtitle(data))
    parts.badges.Set(QuestsView.Badges(data, now))
    local pinned = {}
    for index, mission in ipairs(QuestsView.Pinned(data, now)) do
        pinned[index] = QuestsView.Sheet(mission, data, now)
    end
    parts.board.Set(pinned)
    parts.noQuest:SetShown(#pinned == 0)
    parts.noQuest.text:SetText(data == nil and QuestsView.Subtitle(data) or QuestsView.NO_QUEST)
    local toCome = QuestsView.ToCome(data, now)
    parts.note:SetText(toCome.note)
    parts.toCome.Set(toCome.quests)
    parts.toCome.empty:SetText(toCome.empty or "")
    local ended = QuestsView.Ended(data, now)
    parts.ended.Set(ended.quests)
    parts.ended.empty:SetText(ended.empty or "")
    local fame = QuestsView.HallOfFame(data)
    parts.fame.Set(fame.entries)
    parts.fame.empty:SetText(fame.empty or "")
    -- The officers' zone under the hall of fame, which takes its room for the others.
    local officer = QuestsData.IsOfficer(VXV.PlayerName())
    parts.officer:SetShown(officer)
    parts.fame.Resize(parts.columnHeight - (officer and OFFICER_HEIGHT + GAP or 0))
end

--- A titled panel whose body holds a stack of items, and a line for when it is empty: { Set(values), empty, panel,
--- heading, Resize(height) }.
local function stackPanel(content, x, y, width, height, title, style, itemHeight, gap, New)
    local panel, body, heading = Theme.TitledPanel(content, x, y, width, height, title, style)
    local stack = Parchment.Stack(body, 0, 0, body:GetWidth(), body:GetHeight(), itemHeight, gap, function(holder)
        return New(holder, body:GetWidth())
    end)
    local empty = Theme.Text(body, "text", 13, "lavender")
    empty:SetPoint("TOPLEFT")
    empty:SetWidth(body:GetWidth())
    -- The title and margins around the body.
    local chrome = height - body:GetHeight()
    return {
        Set = stack.Set,
        empty = empty,
        panel = panel,
        heading = heading,
        Resize = function(newHeight)
            panel:SetHeight(newHeight)
            body:SetHeight(newHeight - chrome)
            stack.SetHeight(body:GetHeight())
        end,
    }
end

local function addBoard(content, width, height)
    parts.board = Parchment.Stack(content, PADDING, GRID_TOP, width, height, height, GAP, function(holder)
        return QuestSheet.New(holder, width, height)
    end)
    local panel, body = Theme.TitledPanel(content, PADDING, GRID_TOP, width, NO_QUEST_HEIGHT, "Quête de la semaine")
    panel.text = Theme.Text(body, "text", 13, "lavender")
    panel.text:SetPoint("TOPLEFT")
    panel.text:SetWidth(body:GetWidth())
    parts.noQuest = panel
end

local function addMiddle(content, x, width, height)
    parts.toCome = stackPanel(content, x, GRID_TOP, width, TO_COME_HEIGHT, "À venir", nil, QuestCards.UPCOMING_HEIGHT,
        CARD_GAP, QuestCards.Upcoming)
    parts.note = Theme.Text(parts.toCome.panel, "textBold", 11, "muted")
    parts.note:SetPoint("TOPRIGHT", -PANEL_PADDING, -NOTE_TOP)
    parts.note:SetJustifyH("RIGHT")
    local top = GRID_TOP + TO_COME_HEIGHT + GAP
    parts.ended = stackPanel(content, x, top, width, height - TO_COME_HEIGHT - GAP, "Terminées", nil,
        QuestCards.ENDED_HEIGHT, CARD_GAP, QuestCards.Ended)
end

local function addRight(content, x, height)
    parts.fame = stackPanel(content, x, GRID_TOP, RIGHT, height, "Hall of fame", "officer", HallOfFame.HEIGHT,
        FAME_GAP, HallOfFame.Entry)
    parts.fame.heading:SetTextColor(Theme.Color("gold"))
    local officer, body = Theme.TitledPanel(content, x, GRID_TOP + height - OFFICER_HEIGHT, RIGHT, OFFICER_HEIGHT,
        "Officier", "officer")
    local note = Theme.Text(officer, "textBold", 11, "muted")
    note:SetPoint("TOPRIGHT", -PANEL_PADDING, -NOTE_TOP)
    note:SetText("visible par les officiers")
    local publish = Theme.Button(body, "wood", "Publier une quête", body:GetWidth(), OFFICER_BUTTON, "gold")
    publish:SetPoint("TOPLEFT")
    publish:SetScript("OnClick", QuestDialog.Open)
    parts.officer = officer
end

function QuestsTab.Build(content)
    parts.head = Screen.Head(content, "Le tableau des quêtes", "gain", "Quêtes")
    parts.badges = Screen.Badges(content)
    local width, height = content:GetWidth() - 2 * PADDING, content:GetHeight() - GRID_TOP - PADDING
    parts.columnHeight = height
    local columns = width - RIGHT - 2 * GAP
    local boardWidth = math.floor(columns * BOARD_SHARE)
    addBoard(content, boardWidth, height)
    addMiddle(content, PADDING + boardWidth + GAP, columns - boardWidth, height)
    addRight(content, PADDING + width - RIGHT, height)
    Screen.Follow(content, render, { "quetes.updated", "quetes.live" })
end
