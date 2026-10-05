local _, ns = ...

--- « Créer un événement » in game (P9.2), for the officers: date and time as on Discord's /vxv_raid ("15/10",
--- "21:00"), the raids among the data packs, the soft reserves per player and the reason the journal keeps. Sent to
--- the website as a change: it creates the event and publishes its sign-up message on Discord.
local EventDialog = {}
ns.EventDialog = EventDialog

local Changes = ns.Changes

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 420
local HEADING_TOP, FIELD_TOP, SECTION = 0, 20, 64
local FIELD_HEIGHT, FIELD_PADDING, SHORT_FIELD = 26, 6, 120
local TOGGLE_GAP, BUTTON_WIDTH, BUTTON_HEIGHT, STEP_SIZE = 6, 160, 30, 26
-- The website's bounds of the soft reserves per player.
local MIN_SOFT_RESERVES, MAX_SOFT_RESERVES, DEFAULT_SOFT_RESERVES = 1, 10, 1
local MAX_LETTERS = { date = 10, time = 5, reason = 200 }
local MISSING = "Indique la date, l'heure, au moins un raid et le motif."

local frame, body, problem, countText
local boxes, toggles = {}, {}
local chosen, softReserves = {}, DEFAULT_SOFT_RESERVES

local function heading(top, text)
    local label = Theme.Text(body, "textBold", 13, "lavender")
    label:SetPoint("TOPLEFT", 0, -(top + HEADING_TOP))
    label:SetText(text)
end

--- A text field under its heading, at x from the left.
local function addField(key, x, top, width, title)
    local label = Theme.Text(body, "textBold", 13, "lavender")
    label:SetPoint("TOPLEFT", x, -top)
    label:SetText(title)
    local holder = CreateFrame("Frame", nil, body)
    holder:SetPoint("TOPLEFT", x, -(top + FIELD_TOP))
    holder:SetSize(width, FIELD_HEIGHT)
    Theme.Fill(holder, "night"):SetAllPoints()
    Theme.Rings(holder, { { "line", 1 } }, true)
    local box = CreateFrame("EditBox", nil, holder)
    box:SetPoint("TOPLEFT", FIELD_PADDING, 0)
    box:SetPoint("BOTTOMRIGHT", -FIELD_PADDING, 0)
    box:SetFontObject(Theme.Font("text", 13))
    box:SetAutoFocus(false)
    box:SetMaxLetters(MAX_LETTERS[key])
    box:SetScript("OnEscapePressed", box.ClearFocus)
    box:SetScript("OnEnterPressed", box.ClearFocus)
    boxes[key] = box
end

--- The raids of the data packs, by name: one toggle each.
local function addRaids(top)
    heading(top, "Raids")
    local raids = {}
    for raidId, raid in pairs(VXV_RaidData or {}) do
        raids[#raids + 1] = { id = raidId, name = raid.name }
    end
    table.sort(raids, function(left, right)
        return left.name < right.name
    end)
    local x = 0
    for _, raid in ipairs(raids) do
        local toggle = Theme.Tab(body, raid.name)
        toggle:SetPoint("TOPLEFT", x, -(top + FIELD_TOP))
        toggle:SetScript("OnClick", function()
            chosen[raid.id] = not chosen[raid.id] or nil
            toggle:SetSelected(chosen[raid.id] == true)
        end)
        toggles[raid.id] = toggle
        x = x + toggle:GetWidth() + TOGGLE_GAP
    end
end

local function showCount()
    countText:SetText(VXV.Count(softReserves, "SR par joueur", "SR par joueur"))
end

local function addCount(top)
    heading(top, "SR par joueur")
    local less = Theme.Button(body, "wood", "-", STEP_SIZE, STEP_SIZE)
    less:SetPoint("TOPLEFT", 0, -(top + FIELD_TOP))
    countText = Theme.Text(body, "pixel", 15, "ivory")
    countText:SetPoint("LEFT", less, "RIGHT", 2 * TOGGLE_GAP, 0)
    local more = Theme.Button(body, "wood", "+", STEP_SIZE, STEP_SIZE)
    more:SetPoint("TOPLEFT", 160, -(top + FIELD_TOP))
    less:SetScript("OnClick", function()
        softReserves = math.max(MIN_SOFT_RESERVES, softReserves - 1)
        showCount()
    end)
    more:SetScript("OnClick", function()
        softReserves = math.min(MAX_SOFT_RESERVES, softReserves + 1)
        showCount()
    end)
end

local function trimmed(key)
    return (boxes[key]:GetText() or ""):match("^%s*(.-)%s*$")
end

local function send()
    local raidIds = {}
    for raidId in pairs(chosen) do
        raidIds[#raidIds + 1] = raidId
    end
    table.sort(raidIds)
    local date, at, reason = trimmed("date"), trimmed("time"), trimmed("reason")
    if date == "" or at == "" or reason == "" or #raidIds == 0 then
        problem:SetText(MISSING)
        return
    end
    if Changes.Submit({ kind = "event", date = date, time = at, raidIds = raidIds, softReserves = softReserves,
        reason = reason }) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_EventDialog", WIDTH, HEIGHT, "Créer un événement")
    addField("date", 0, 0, SHORT_FIELD, "Date (15/10)")
    addField("time", SHORT_FIELD + 2 * TOGGLE_GAP, 0, SHORT_FIELD, "Heure (21:00)")
    addRaids(SECTION)
    addCount(2 * SECTION)
    addField("reason", 0, 3 * SECTION, body:GetWidth(), "Motif (visible dans le journal)")
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Créer", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens an empty form.
function EventDialog.Open()
    if frame == nil then
        build()
    end
    chosen, softReserves = {}, DEFAULT_SOFT_RESERVES
    for _, box in pairs(boxes) do
        box:SetText("")
    end
    for _, toggle in pairs(toggles) do
        toggle:SetSelected(false)
    end
    showCount()
    problem:SetText("")
    frame:Show()
end
