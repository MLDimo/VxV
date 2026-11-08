local ns = select(2, ...).Fishing

--- The entry of fishing in one button (mockup AddonPeche, §1, §5 and §6), in the Artisans screen and the reduced
--- mode: the character's fishing level, the button that starts or ends a session, why a start failed, the fishing key
--- and how to change it, and the last session. A character who does not fish reads that it is for fishers.
local FishingPanel = {}
ns.FishingPanel = FishingPanel

local Key, Session, Skill = ns.Key, ns.Session, ns.Skill

local Theme = VXV.Theme

local BUTTON_HEIGHT, SMALL_BUTTON_HEIGHT, CHANGE_WIDTH = 34, 22, 90
local BAR_HEIGHT, KEYCAP = 6, 22
local LINE, GAP = 18, 12
local PROBLEMS = {
    pole = "Aucune canne à pêche dans tes sacs",
    fight = "Impossible pendant un combat",
}
local NOT_A_FISHER = "Ce personnage ne pêche pas : la pêche en un bouton est réservée aux pêcheurs. "
    .. "Apprends la Pêche auprès d'un maître pêcheur."
-- Keys that only modify another: the capture waits for the next one.
local MODIFIERS = { LSHIFT = true, RSHIFT = true, LCTRL = true, RCTRL = true, LALT = true, RALT = true }
local ESCAPE = "ESCAPE"

--- The key's row: the key in its cap, « Changer »; while listening, « Appuie sur une touche… » and « Annuler ».
local function keyRow(panel, width, y)
    local row = CreateFrame("Frame", nil, panel)
    row:SetSize(width, KEYCAP)
    row:SetPoint("TOPLEFT", 0, y)
    local label = Theme.Text(row, "textBold", 13, "lavender")
    label:SetPoint("LEFT")
    label:SetText("Touche de pêche :")
    local cap = CreateFrame("Frame", nil, row)
    cap:SetSize(KEYCAP + 8, KEYCAP)
    cap:SetPoint("LEFT", label, "RIGHT", 8, 0)
    Theme.Fill(cap, "ink"):SetAllPoints()
    Theme.Rings(cap, { { "gold", 1 } }, true)
    row.key = Theme.Text(cap, "pixel", 13, "gold")
    row.key:SetPoint("CENTER")
    row.change = Theme.Button(row, "wood", "Changer", CHANGE_WIDTH, SMALL_BUTTON_HEIGHT)
    row.change:SetPoint("RIGHT")
    row.note = Theme.Text(panel, "text", 11, "muted")
    row.note:SetPoint("TOPLEFT", 0, y - KEYCAP - 4)
    row.note:SetWidth(width)
    -- The capture: the next key pressed becomes the fishing key; Escape cancels.
    local capture = CreateFrame("Frame", nil, row)
    row.capture = capture
    capture:SetScript("OnKeyDown", function(_, key)
        if MODIFIERS[key] then
            return
        end
        capture:EnableKeyboard(false)
        row.listening = false
        if key ~= ESCAPE then
            Key.Set(key)
        end
        VXV.Emit("fishing.changed")
    end)
    row.change:SetScript("OnClick", function()
        if row.listening then
            row.listening = false
            capture:EnableKeyboard(false)
        elseif not InCombatLockdown() and Session.State() == "off" then
            row.listening = true
            capture:EnableKeyboard(true)
        end
        VXV.Emit("fishing.changed")
    end)
    return row
end

local function renderKey(row)
    local key = Key.Current()
    row.key:SetText(row.listening and "…" or key)
    row.change:SetText(row.listening and "Annuler" or "Changer")
    local taken = Key.Taken(key)
    if row.listening then
        row.note:SetText("Appuie sur une touche… (Échap pour annuler)")
    elseif taken ~= nil then
        row.note:SetText(("%s sert aussi à « %s » : remplacée pendant la session."):format(key, taken))
    else
        row.note:SetText("Sert aussi à reprendre ton arme en combat.")
    end
end

--- « 23 prises · 18:40 · Meilleure prise : Poisson-chat boueux ».
local function lastSession()
    local last = Session.Last()
    if last == nil then
        return "Aucune session pour l'instant."
    end
    local line = ("%s · %s"):format(VXV.Count(last.catches or 0, "prise", "prises"), Session.Clock(last.seconds or 0))
    if last.best ~= nil and last.best.name ~= nil then
        line = line .. " · Meilleure prise : " .. Theme.Colored(last.best.name, "gain")
    end
    return line
end

--- Builds the panel in the parent, at its top, as wide as width; returns it with Render(), drawn for the character.
function FishingPanel.Create(parent, width)
    local panel = CreateFrame("Frame", nil, parent)
    panel:SetPoint("TOPLEFT")
    panel:SetSize(width, parent:GetHeight())
    local fisher = CreateFrame("Frame", nil, panel)
    fisher:SetAllPoints()
    local kicker = Theme.Text(fisher, "textHeavy", 11, "ember")
    kicker:SetPoint("TOPLEFT")
    kicker:SetText(Theme.Upper("Ton métier · Pêche"))
    local level = Theme.Text(fisher, "text", 13, "ivory")
    level:SetPoint("TOPLEFT", 0, -LINE)
    local track = Theme.Fill(fisher, "line")
    track:SetPoint("TOPLEFT", 0, -2 * LINE - 4)
    track:SetSize(width, BAR_HEIGHT)
    local bar = Theme.Fill(fisher, "ember", "ARTWORK")
    bar:SetPoint("TOPLEFT", track, "TOPLEFT")
    bar:SetHeight(BAR_HEIGHT)
    local top = -2 * LINE - BAR_HEIGHT - GAP - 4
    local start = Theme.Button(fisher, "pixel", "", width, BUTTON_HEIGHT)
    start:SetPoint("TOPLEFT", 0, top)
    start:SetScript("OnClick", Session.Toggle)
    local problem = Theme.Text(fisher, "textBold", 12, "loss")
    problem:SetPoint("TOPLEFT", 0, top - BUTTON_HEIGHT - 6)
    local row = keyRow(fisher, width, top - BUTTON_HEIGHT - LINE - GAP)
    local heading = Theme.Heading(fisher, "Dernière session")
    heading:SetPoint("TOPLEFT", 0, top - BUTTON_HEIGHT - 2 * LINE - KEYCAP - 2 * GAP)
    local last = Theme.Text(fisher, "text", 12, "lavender")
    last:SetPoint("TOPLEFT", heading, "BOTTOMLEFT", 0, -6)
    last:SetWidth(width)
    local stranger = Theme.Text(panel, "text", 13, "muted")
    stranger:SetPoint("TOPLEFT")
    stranger:SetWidth(width)
    stranger:SetText(NOT_A_FISHER)

    function panel.Render()
        local skill = Skill.Read()
        fisher:SetShown(skill ~= nil)
        stranger:SetShown(skill == nil)
        if skill == nil then
            return
        end
        level:SetText(("Pêche · %d / %d"):format(skill.level, skill.max))
        bar:SetWidth(math.max(1, width * skill.level / math.max(skill.max, 1)))
        start:SetText(Session.State() == "off" and "Lancer une session de pêche" or "Quitter la session")
        problem:SetText(PROBLEMS[Session.Problem()] or "")
        renderKey(row)
        last:SetText(lastSession())
    end
    return panel
end
