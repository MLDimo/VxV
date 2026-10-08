local _, ns = ...

--- « Mon inscription » to a guild event, in game: the role, the specialisation and the status of the player's
--- character, handed to the bundle that sends them to the website (a raid night's, a PvP outing's).
local SignupDialog = {}
ns.SignupDialog = SignupDialog

local Dialog, SignupLabels, Theme = ns.Dialog, ns.SignupLabels, ns.Theme

local WIDTH, HEIGHT = 480, 390
local TOGGLE_TOP, SECTION_GAP, TOGGLE_GAP = 22, 66, 6
local FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 6, 160, 30
-- The website's limit for a specialisation.
local MAX_SPEC_LETTERS = 30
local MISSING = "Choisis ton rôle, ta spécialisation et ton statut."

local frame, body, subtitle, specBox, problem, onSend
local toggles = { role = {}, status = {} }
local choice = {}

local function show(field)
    for key, toggle in pairs(toggles[field]) do
        toggle:SetSelected(key == choice[field])
    end
end

local function heading(top, text)
    Theme.Heading(body, text):SetPoint("TOPLEFT", 0, -top)
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
    if onSend({ role = choice.role, spec = spec, status = choice.status }) then
        frame:Hide()
    end
end

local function build()
    frame, body = Dialog.Create("VXV_SignupDialog", WIDTH, HEIGHT, "Mon inscription")
    subtitle = Theme.Text(body, "text", 13, "lavender")
    subtitle:SetPoint("TOPLEFT")
    addToggles(SECTION_GAP / 2, "Rôle", "role", SignupLabels.ROLE_ORDER, function(role)
        return SignupLabels.Role(role).label
    end)
    addSpecField(SECTION_GAP / 2 + SECTION_GAP)
    addToggles(SECTION_GAP / 2 + 2 * SECTION_GAP, "Statut", "status", SignupLabels.STATUS_ORDER, SignupLabels.Status)
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + FIELD_PADDING)
    local button = Theme.Button(body, "pixel", "Envoyer", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens the dialog: { subtitle ("Personnage : Ðéjà Vu · Onyxia"), current ({ role, spec, status } or nil), send
--- ({ role, spec, status }): true when the change is recorded, which closes the dialog }.
function SignupDialog.Open(options)
    if frame == nil then
        build()
    end
    onSend = options.send
    local current = options.current
    choice = { role = current and current.role, status = current and current.status }
    show("role")
    show("status")
    specBox:SetText(current and current.spec or "")
    subtitle:SetText(options.subtitle)
    problem:SetText("")
    frame:Show()
end
