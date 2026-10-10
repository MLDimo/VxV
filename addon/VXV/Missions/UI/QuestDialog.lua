local ns = select(2, ...).Missions

--- « Publier une quête » in game, for the officers, as Discord's /vxv_mission: what the game's counters count (chosen
--- with two arrows), a title (else the type's), the reward shared 70 / 20 / 10 %, how many days from now, and the
--- reason the journal keeps. Sent to the website as a change: it publishes the quest and its message on Discord.
local QuestDialog = {}
ns.QuestDialog = QuestDialog

local Changes, Counters = ns.Changes, ns.Counters

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 400
local FIELD_TOP, SECTION, SHORT_FIELD, GAP = 20, 64, 120, 12
local ARROW_SIZE, ARROW_GAP, FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 26, 6, 6, 160, 30
-- The website's limits (packages/server/src/domain/missions.ts).
local MAX_LETTERS = { title = 60, reward = 9, days = 2, reason = 200 }
local MAX_DAYS, DEFAULT_DAYS = 31, "7"
local NO_TYPE = "Choisis le type avec les flèches."
local MISSING = "Il manque : %s."

local frame, body, problem, typeLabel, chosen
local boxes = {}

local function addField(key, x, top, width, title)
    Theme.Heading(body, title):SetPoint("TOPLEFT", x, -top)
    local holder, box = Theme.Field(body, width, MAX_LETTERS[key])
    holder:SetPoint("TOPLEFT", x, -(top + FIELD_TOP))
    boxes[key] = box
end

local function trimmed(key)
    return (boxes[key]:GetText() or ""):match("^%s*(.-)%s*$")
end

--- A whole number typed between low and high, else nil.
local function whole(key, low, high)
    local value = tonumber(trimmed(key):match("^%d+$"))
    return value ~= nil and value >= low and value <= high and value or nil
end

local function showType()
    typeLabel:SetText(chosen and Counters.LABELS[Counters.KINDS[chosen]].name or NO_TYPE)
end

--- The previous (-1) or next (1) type, round the list; from none, the first or the last.
local function step(direction)
    local count = #Counters.KINDS
    chosen = chosen == nil and (direction > 0 and 1 or count) or (chosen - 1 + direction) % count + 1
    showType()
end

local function send()
    local reward, days, reason = whole("reward", 1, math.huge), whole("days", 1, MAX_DAYS), trimmed("reason")
    -- Each part left empty or wrong, named: the officer sees what to fill.
    local missing = {}
    for _, part in ipairs({
        { chosen == nil, "le type (flèches)" }, { reward == nil, "la récompense en po entières" },
        { days == nil, ("la durée, de 1 à %d jours"):format(MAX_DAYS) }, { reason == "", "le motif" },
    }) do
        if part[1] then
            missing[#missing + 1] = part[2]
        end
    end
    if #missing > 0 then
        problem:SetText(MISSING:format(table.concat(missing, ", ")))
        return
    end
    if Changes.Publish({ type = Counters.KINDS[chosen], title = trimmed("title"), reward = reward, days = days,
        reason = reason }) then
        frame:Hide()
    end
end

local function addTypeStepper()
    Theme.Heading(body, "Type (ce que comptent les compteurs du jeu)"):SetPoint("TOPLEFT", 0, 0)
    local previous = Theme.Button(body, "wood", "<", ARROW_SIZE, ARROW_SIZE)
    previous:SetPoint("TOPLEFT", 0, -FIELD_TOP)
    previous:SetScript("OnClick", function()
        step(-1)
    end)
    local following = Theme.Button(body, "wood", ">", ARROW_SIZE, ARROW_SIZE)
    following:SetPoint("LEFT", previous, "RIGHT", ARROW_GAP, 0)
    following:SetScript("OnClick", function()
        step(1)
    end)
    typeLabel = Theme.Text(body, "text", 13, "ivory")
    typeLabel:SetPoint("LEFT", following, "RIGHT", 2 * ARROW_GAP, 0)
end

local function build()
    frame, body = VXV.CreateDialog("VXV_QuestDialog", WIDTH, HEIGHT, "Publier une quête")
    addTypeStepper()
    addField("title", 0, SECTION, body:GetWidth(), "Titre (sinon celui du type)")
    addField("reward", 0, 2 * SECTION, SHORT_FIELD, "Récompense (po)")
    addField("days", SHORT_FIELD + GAP, 2 * SECTION, SHORT_FIELD, "Durée (jours)")
    addField("reason", 0, 3 * SECTION, body:GetWidth(), "Motif (visible dans le journal)")
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    problem:SetPoint("BOTTOMRIGHT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Publier", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens an empty form: no type chosen, a week.
function QuestDialog.Open()
    if frame == nil then
        build()
    end
    for _, box in pairs(boxes) do
        box:SetText("")
    end
    boxes.days:SetText(DEFAULT_DAYS)
    chosen = nil
    showType()
    problem:SetText("")
    frame:Show()
end
