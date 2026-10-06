local _, ns = ...

--- "Mon inscription" in game (P7.5): the role, specialisation and status of the player's character, sent to the
--- website as a change (Changes.lua). Filled with the change waiting for the website, else the sign-up it knows.
local SignupDialog = {}
ns.SignupDialog = SignupDialog

local Changes, EventData, Labels, RaidData = ns.Changes, ns.EventData, ns.Labels, ns.RaidData

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 390
local HEADING_HEIGHT, TOGGLE_TOP, SECTION_GAP, TOGGLE_GAP = 18, 22, 66, 6
local FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 6, 160, 30
-- The website's limit for a specialisation.
local MAX_SPEC_LETTERS = 30
local STATUS_ORDER = { "present", "late", "maybe", "bench", "absent" }
local MISSING = "Choisis ton rôle, ta spécialisation et ton statut."

local frame, body, character, specBox, problem
local toggles = { role = {}, status = {} }
local choice = {}

local function show(field)
    for key, toggle in pairs(toggles[field]) do
        toggle:SetSelected(key == choice[field])
    end
end

local function heading(top, text)
    local label = Theme.Text(body, "textBold", 13, "lavender")
    label:SetPoint("TOPLEFT", 0, -top)
    label:SetText(text)
end

--- A row of toggles under a heading: one value of the field is chosen.
local function addToggles(top, title, field, keys, labelOf)
    heading(top, title)
    local x = 0
    for _, key in ipairs(keys) do
        local toggle = Theme.Tab(body, labelOf(key))
        toggle:SetPoint("TOPLEFT", x, -(top + TOGGLE_TOP))
        toggle:SetScript("OnClick", function()
            choice[field] = key
            show(field)
        end)
        toggles[field][key] = toggle
        x = x + toggle:GetWidth() + TOGGLE_GAP
    end
end

local function addSpecField(top)
    heading(top, "Spécialisation")
    local holder
    holder, specBox = Theme.Field(body, body:GetWidth(), MAX_SPEC_LETTERS)
    holder:SetPoint("TOPLEFT", 0, -(top + TOGGLE_TOP))
end

local function send()
    local spec = (specBox:GetText() or ""):match("^%s*(.-)%s*$")
    if choice.role == nil or choice.status == nil or spec == "" then
        problem:SetText(MISSING)
        return
    end
    if Changes.Submit({ kind = "signup", role = choice.role, spec = spec, status = choice.status }) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_SignupDialog", WIDTH, HEIGHT, "Mon inscription")
    character = Theme.Text(body, "text", 13, "lavender")
    character:SetPoint("TOPLEFT")
    addToggles(SECTION_GAP / 2, "Rôle", "role", Labels.ROLE_ORDER, function(role)
        return Labels.Role(role).label
    end)
    addSpecField(SECTION_GAP / 2 + SECTION_GAP)
    addToggles(SECTION_GAP / 2 + 2 * SECTION_GAP, "Statut", "status", STATUS_ORDER, Labels.Status)
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Envoyer", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens the dialog for the current event's sign-up of the player's character.
function SignupDialog.Open()
    local event, player = RaidData.Current(), VXV.PlayerName()
    if event == nil or player == nil then
        return
    end
    if frame == nil then
        build()
    end
    local current = Changes.Pending("signup") or EventData.SignupOf(event, player)
    choice = { role = current and current.role, status = current and current.status }
    show("role")
    show("status")
    specBox:SetText(current and current.spec or "")
    character:SetText("Personnage : " .. player .. " · " .. event.title)
    problem:SetText("")
    frame:Show()
end
