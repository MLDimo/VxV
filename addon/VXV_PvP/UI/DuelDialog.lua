local _, ns = ...

--- « Défier » in game: the challenged member (the player's target, or a name typed as « Prénom Nom »), the date and
--- time as on the website ("15/10", "21:00") and the place. Sent to the website as a change: it calls the challenged
--- member on Discord.
local DuelDialog = {}
ns.DuelDialog = DuelDialog

local Changes, PvpData = ns.Changes, ns.PvpData

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 330
local FIELD_TOP, SECTION, SHORT_FIELD, GAP = 20, 64, 120, 12
local FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 6, 160, 30
-- The website's limits: a character's name, a date, a time, a place.
local MAX_LETTERS = { opponent = 60, date = 10, time = 5, place = 60 }
local MISSING = "Il manque : %s."
local UNKNOWN = "Ce personnage n'est lié à aucun membre de la guilde sur le site."
local MYSELF = "Choisis un autre joueur que toi."

local frame, body, problem
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

--- The member of a character the PvP data know, its case aside: « thom leboss » is Thom Leboss's.
local function memberNamed(data, name)
    local lower = name:lower()
    for character, memberId in pairs(data and data.members or {}) do
        if character:lower() == lower then
            return memberId
        end
    end
    return nil
end

local function send()
    local values, missing = {}, {}
    for _, part in ipairs({ { "opponent", "le joueur défié" }, { "date", "la date" }, { "time", "l'heure" },
        { "place", "le lieu" } }) do
        values[part[1]] = trimmed(part[1])
        if values[part[1]] == "" then
            missing[#missing + 1] = part[2]
        end
    end
    if #missing > 0 then
        problem:SetText(MISSING:format(table.concat(missing, ", ")))
        return
    end
    local data = PvpData.Current()
    local opponentId = memberNamed(data, values.opponent)
    if opponentId == nil then
        problem:SetText(UNKNOWN)
        return
    end
    if opponentId == VXV.MemberOf(data) then
        problem:SetText(MYSELF)
        return
    end
    if Changes.Submit({ kind = "duel", opponentId = opponentId, date = values.date, time = values.time,
        place = values.place }) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_DuelDialog", WIDTH, HEIGHT, "Défier un joueur")
    addField("opponent", 0, 0, body:GetWidth(), "Joueur défié (ta cible, ou Prénom Nom)")
    addField("date", 0, SECTION, SHORT_FIELD, "Date (15/10)")
    addField("time", SHORT_FIELD + GAP, SECTION, SHORT_FIELD, "Heure (21:00)")
    addField("place", 0, 2 * SECTION, body:GetWidth(), "Lieu")
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    problem:SetPoint("BOTTOMRIGHT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Défier", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens the form, the player's target as the challenged member.
function DuelDialog.Open()
    if frame == nil then
        build()
    end
    for _, box in pairs(boxes) do
        box:SetText("")
    end
    boxes.opponent:SetText(VXV.NameOfUnit("target") or "")
    problem:SetText("")
    frame:Show()
end
