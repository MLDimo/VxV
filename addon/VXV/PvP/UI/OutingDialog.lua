local ns = select(2, ...).PvP

--- « Créer un événement PvP » in game, for the officers: as « Créer un événement » for a raid night, with a title
--- instead of raids and no soft reserve; who may sign up among the Discord roles the officer's companion brought. Sent
--- to the website as a change: it creates the event and publishes its sign-up message on Discord.
local OutingDialog = {}
ns.OutingDialog = OutingDialog

local Changes = ns.Changes

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 400
local FIELD_TOP, SECTION, SHORT_FIELD, GAP = 20, 64, 120, 12
local FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 6, 160, 30
-- The website's limits: a title, a date, a time, a reason.
local MAX_LETTERS = { title = 60, date = 10, time = 5, reason = 200 }
local MISSING = "Il manque : %s."

local frame, body, problem, roleStepper
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

local function send()
    local values, role = {}, roleStepper.Chosen()
    for _, key in ipairs({ "title", "date", "time", "reason" }) do
        values[key] = trimmed(key)
    end
    -- Each part left empty, named: the officer sees what to fill.
    local missing = {}
    for _, part in ipairs({
        { values.title == "", "le titre" }, { values.date == "", "la date" }, { values.time == "", "l'heure" },
        { role == nil, "qui peut s'inscrire (flèches)" }, { values.reason == "", "le motif" },
    }) do
        if part[1] then
            missing[#missing + 1] = part[2]
        end
    end
    if #missing > 0 then
        problem:SetText(MISSING:format(table.concat(missing, ", ")))
        return
    end
    if Changes.Submit({ kind = "pvpEvent", title = values.title, date = values.date, time = values.time,
        roleId = role.id, reason = values.reason }) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_OutingDialog", WIDTH, HEIGHT, "Créer un événement PvP")
    addField("title", 0, 0, body:GetWidth(), "Titre (Raid sur Astranaar)")
    addField("date", 0, SECTION, SHORT_FIELD, "Date (15/10)")
    addField("time", SHORT_FIELD + GAP, SECTION, SHORT_FIELD, "Heure (21:00)")
    roleStepper = VXV.RoleStepper(body, 2 * SECTION)
    addField("reason", 0, 3 * SECTION, body:GetWidth(), "Motif (visible dans le journal)")
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    problem:SetPoint("BOTTOMRIGHT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Créer", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens an empty form.
function OutingDialog.Open()
    if frame == nil then
        build()
    end
    for _, box in pairs(boxes) do
        box:SetText("")
    end
    roleStepper.Reset()
    problem:SetText("")
    frame:Show()
end
