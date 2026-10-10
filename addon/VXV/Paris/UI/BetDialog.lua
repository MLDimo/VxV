local ns = select(2, ...).Paris

--- « Ouvrir un pari » in game, for the officers (owner's decision of 7 October): the question, its choices
--- separated by « ; » as on Discord's /vxv_pari, the closing date and time ("15/10", "21:00") and the reason the
--- journal keeps. Sent to the website as a change: it opens the bet and publishes its message on Discord.
local BetDialog = {}
ns.BetDialog = BetDialog

local Changes = ns.Changes

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 360
local FIELD_TOP, SECTION = 20, 64
local FIELD_PADDING, SHORT_FIELD, FIELD_GAP = 6, 120, 12
local BUTTON_WIDTH, BUTTON_HEIGHT = 160, 30
-- The website's bounds (packages/server/src/domain/bets.ts).
local MIN_CHOICES, MAX_CHOICES = 2, 10
local MAX_LETTERS = { title = 100, choices = 500, date = 10, time = 5, reason = 200 }
local CHOICE_SEPARATOR = ";"
local MISSING = "Indique la question, de 2 à 10 choix séparés par « ; », la date, l'heure et le motif."

local frame, body, problem
local boxes = {}

--- A text field under its heading, at x from the left.
local function addField(key, x, top, width, title)
    Theme.Heading(body, title):SetPoint("TOPLEFT", x, -top)
    local holder, box = Theme.Field(body, width, MAX_LETTERS[key])
    holder:SetPoint("TOPLEFT", x, -(top + FIELD_TOP))
    boxes[key] = box
end

local function trimmed(text)
    return (text or ""):match("^%s*(.-)%s*$")
end

--- The choices typed, each trimmed, the empty ones left aside.
function BetDialog.Choices(text)
    local choices = {}
    for choice in ((text or "") .. CHOICE_SEPARATOR):gmatch("([^" .. CHOICE_SEPARATOR .. "]*)" .. CHOICE_SEPARATOR) do
        if trimmed(choice) ~= "" then
            choices[#choices + 1] = trimmed(choice)
        end
    end
    return choices
end

local function send()
    local bet = {
        title = trimmed(boxes.title:GetText()),
        choices = BetDialog.Choices(boxes.choices:GetText()),
        date = trimmed(boxes.date:GetText()),
        time = trimmed(boxes.time:GetText()),
        reason = trimmed(boxes.reason:GetText()),
    }
    if bet.title == "" or bet.date == "" or bet.time == "" or bet.reason == "" or #bet.choices < MIN_CHOICES
        or #bet.choices > MAX_CHOICES then
        problem:SetText(MISSING)
        return
    end
    if Changes.Open(bet) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_BetDialog", WIDTH, HEIGHT, "Ouvrir un pari")
    local width = body:GetWidth()
    addField("title", 0, 0, width, "Question")
    addField("choices", 0, SECTION, width, "Choix, séparés par « ; »")
    addField("date", 0, 2 * SECTION, SHORT_FIELD, "Fermeture (15/10)")
    addField("time", SHORT_FIELD + FIELD_GAP, 2 * SECTION, SHORT_FIELD, "Heure (21:00)")
    addField("reason", 0, 3 * SECTION, width, "Motif (visible dans le journal)")
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Ouvrir le pari", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens an empty form.
function BetDialog.Open()
    if frame == nil then
        build()
    end
    for _, box in pairs(boxes) do
        box:SetText("")
    end
    problem:SetText("")
    frame:Show()
end
