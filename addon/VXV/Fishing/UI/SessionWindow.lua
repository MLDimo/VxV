local ns = select(2, ...).Fishing

--- The session's window over the game (mockup AddonPeche, §2 to §4): the big fishing button, which casts, hooks and
--- shows the catch, the key on it, the catches and the time, the lure, « Quitter la session »; a red banner in a
--- fight; the summary once the session ends. It holds secure buttons: it shows, hides and changes size only out of
--- combat, and it is not closed by Escape.
local SessionWindow = {}
ns.SessionWindow = SessionWindow

local Gear, Key, Session = ns.Gear, ns.Key, ns.Session

local Theme = VXV.Theme

local NAME = "VXV_FishingWindow"
local MEDIA = "Interface\\AddOns\\VXV\\Fishing\\Media\\"
local WIDTH, HEIGHT, SUMMARY_HEIGHT = 300, 160, 196
local BOTTOM_OFFSET = 220
local RINGS = { { "ink", 2 }, { "copper", 3 }, { "ink", 2 } }
local BORDER, BAR_HEIGHT, PADDING, GAP = 7, 22, 10, 10
local BUTTON_WIDTH, BUTTON_HEIGHT, BEVEL, KEYCAP = 88, 84, 3, 16
local SMALL_BUTTON_HEIGHT, QUIT_WIDTH, LURE_WIDTH, LURE_HEIGHT = 22, 130, 120, 20
-- The right column's lines under the big button's top: the state, the catches and time, the lure.
local STATS_LINE, LURE_LINE = 20, 40
local BANNER_HEIGHT = 20
local PROGRESS_HEIGHT = 3
local TICK_SECONDS = 0.15
-- The pixel art's images at twice their size; the catch's icon from the game.
local SCALE = 2
local POLE = { file = "canne.png", width = 16, height = 16 }
local FISH = { file = "poisson.png", width = 16, height = 16 }
local WAVES = { file = "onde-%d.png", frames = 4, step = 0.3, width = 40, height = 24 }
local SPLASH = { file = "eclaboussure-%d.png", frames = 3, step = 0.15, width = 40, height = 24 }
local ITEM_ICON = 36
-- The button's look in each state: background, light and dark edges, label and its color.
local LOOKS = {
    ready = { "amethyst-button", "amethyst-light", "amethyst-shade", "Pêcher", "ivory" },
    fishing = { "gold", "gold-light", "gold-shade", "Ferrer", "ink" },
    hooked = { "gold", "gold-light", "gold-shade", "Ferrer", "ink" },
    caught = { "wood", "gold", "wood-shade", "Prise !", "gold" },
    fight = { "ink-loss", "loss", "wood-shade", "Pêcher", "muted" },
    far = { "line", "muted", "ink", "Pêcher", "muted" },
}

local window, live, summary
local button, lure, quit, ticking
local hookedAt
-- Whether the bags hold a lure, read again at each change of the session (out of combat), not at each moment.
local lureInBags = false
-- Whether the window showed a session at its last drawing: its end shows the summary, a failed start nothing.
local wasRunning = false

local function setImage(texture, image, frame)
    texture:SetTexture(MEDIA .. image.file:format(frame or 1), nil, nil, "NEAREST")
    texture:SetSize(image.width * SCALE, image.height * SCALE)
end

--- The image of an animation at this time, looping or played once.
local function animate(texture, image, since, loop)
    local step = math.floor((GetTime() - since) / image.step)
    setImage(texture, image, loop and step % image.frames + 1 or math.min(step + 1, image.frames))
end

--- The fishing button drawn on its secure frame: background, bevel, icon, label, the key, the line's time.
local function drawButton(parent)
    local secure = Key.FishingButton()
    secure:SetParent(parent)
    secure:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    secure:SetPoint("TOPLEFT", BORDER + PADDING, -(BORDER + BAR_HEIGHT + PADDING))
    secure.background = Theme.Fill(secure, "amethyst-button")
    secure.background:SetAllPoints()
    secure.edges = {}
    for index = 1, 4 do
        secure.edges[index] = Theme.Fill(secure, "amethyst-light", "BORDER")
    end
    secure.edges[1]:SetPoint("TOPLEFT")
    secure.edges[1]:SetPoint("BOTTOMRIGHT", secure, "TOPRIGHT", 0, -BEVEL)
    secure.edges[2]:SetPoint("TOPLEFT")
    secure.edges[2]:SetPoint("BOTTOMRIGHT", secure, "BOTTOMLEFT", BEVEL, 0)
    secure.edges[3]:SetPoint("TOPLEFT", secure, "BOTTOMLEFT", 0, BEVEL)
    secure.edges[3]:SetPoint("BOTTOMRIGHT")
    secure.edges[4]:SetPoint("TOPLEFT", secure, "TOPRIGHT", -BEVEL, 0)
    secure.edges[4]:SetPoint("BOTTOMRIGHT")
    Theme.Rings(secure, { { "ink", 2 } })
    secure.icon = secure:CreateTexture(nil, "ARTWORK")
    secure.icon:SetPoint("CENTER", 0, BEVEL * 2)
    secure.label = Theme.Text(secure, "pixel", 15, "ivory")
    secure.label:SetPoint("BOTTOM", 0, BEVEL * 3)
    local keycap = CreateFrame("Frame", nil, secure)
    keycap:SetSize(KEYCAP, KEYCAP)
    keycap:SetPoint("TOPLEFT", BEVEL + 2, -(BEVEL + 2))
    Theme.Fill(keycap, "ink"):SetAllPoints()
    secure.key = Theme.Text(keycap, "pixel", 11, "gold")
    secure.key:SetPoint("CENTER")
    secure.progress = Theme.Fill(secure, "gold-shade", "OVERLAY")
    secure.progress:SetPoint("BOTTOMLEFT", BEVEL, BEVEL)
    secure.progress:SetHeight(PROGRESS_HEIGHT)
    return secure
end

--- The lure's button: a small wood button on its secure frame.
local function drawLure(parent)
    local secure = Key.LureButton()
    secure:SetParent(parent)
    secure:SetSize(LURE_WIDTH, LURE_HEIGHT)
    Theme.Fill(secure, "wood"):SetAllPoints()
    Theme.Rings(secure, { { "ink", 2 } })
    local label = Theme.Text(secure, "pixel", 13, "parchment")
    label:SetPoint("CENTER")
    label:SetText("Poser l'appât")
    return secure
end

local function text(parent, style, size, color, x, y)
    local line = Theme.Text(parent, style, size, color)
    line:SetPoint("TOPLEFT", x, y)
    return line
end

--- What shows during the session: the button, its lines on the right, the lure and the quit buttons, the banner.
local function buildLive()
    live = CreateFrame("Frame", nil, window)
    live:SetAllPoints()
    button = drawButton(window)
    local left = BORDER + PADDING + BUTTON_WIDTH + GAP
    local top = -(BORDER + BAR_HEIGHT + PADDING)
    live.status = text(live, "textBold", 12, "gain", left, top)
    live.stats = text(live, "text", 12, "lavender", left, top - STATS_LINE)
    live.lure = text(live, "text", 11, "muted", left, top - LURE_LINE)
    -- The lure's button takes the lure's line when the bags hold one: under the catches, above « Quitter ».
    lure = drawLure(window)
    lure:SetPoint("TOPLEFT", left, top - LURE_LINE + 2)
    quit = Theme.Button(live, "wood", "Quitter la session", QUIT_WIDTH, SMALL_BUTTON_HEIGHT)
    quit:SetPoint("BOTTOMRIGHT", -(BORDER + PADDING), BORDER + PADDING - 2)
    quit:SetScript("OnClick", Session.Stop)
    live.banner = CreateFrame("Frame", nil, live)
    live.banner:SetPoint("TOPLEFT", BORDER, -(BORDER + BAR_HEIGHT))
    live.banner:SetPoint("TOPRIGHT", -BORDER, -(BORDER + BAR_HEIGHT))
    live.banner:SetHeight(BANNER_HEIGHT)
    Theme.Fill(live.banner, "ink-loss", "ARTWORK"):SetAllPoints()
    live.banner.label = Theme.Text(live.banner, "textBold", 11, "ivory")
    live.banner.label:SetPoint("LEFT", PADDING, 0)
end

--- What shows once the session ends: the catches, the time, the best catch, and how to fish again or close.
local function buildSummary()
    summary = CreateFrame("Frame", nil, window)
    summary:SetAllPoints()
    local left, top = BORDER + PADDING, -(BORDER + BAR_HEIGHT + PADDING)
    summary.catches = text(summary, "pixelBold", 22, "gain", left, top)
    summary.time = text(summary, "pixelBold", 22, "ivory", left + 110, top)
    text(summary, "textHeavy", 10, "muted", left, top - 26):SetText("PRISES")
    text(summary, "textHeavy", 10, "muted", left + 110, top - 26):SetText("DURÉE")
    summary.best = text(summary, "text", 12, "lavender", left, top - 50)
    summary.weapons = text(summary, "text", 12, "gain", left, top - 70)
    summary.reason = text(summary, "textBold", 11, "loss", left, top - 88)
    summary.reason:SetWidth(WIDTH - 2 * (BORDER + PADDING))
    local again = Theme.Button(summary, "pixel", "Relancer", 100, SMALL_BUTTON_HEIGHT)
    again:SetPoint("BOTTOMRIGHT", -(BORDER + PADDING + 90), BORDER + PADDING - 2)
    again:SetScript("OnClick", Session.Start)
    local close = Theme.Button(summary, "wood", "Fermer", 80, SMALL_BUTTON_HEIGHT)
    close:SetPoint("BOTTOMRIGHT", -(BORDER + PADDING), BORDER + PADDING - 2)
    close:SetScript("OnClick", function()
        window:Hide()
    end)
end

local function create()
    window = CreateFrame("Frame", NAME, UIParent)
    window:Hide()
    window:SetSize(WIDTH, HEIGHT)
    window:SetPoint("BOTTOM", 0, BOTTOM_OFFSET)
    window:SetClampedToScreen(true)
    window:SetMovable(true)
    window:EnableMouse(true)
    window:RegisterForDrag("LeftButton")
    window:SetScript("OnDragStart", function()
        if not InCombatLockdown() then
            window:StartMoving()
        end
    end)
    window:SetScript("OnDragStop", window.StopMovingOrSizing)
    Theme.Fill(window, "night-window"):SetAllPoints()
    Theme.Rings(window, RINGS, true)
    local bar = Theme.Fill(window, "wood-night", "ARTWORK")
    bar:SetPoint("TOPLEFT", BORDER, -BORDER)
    bar:SetPoint("TOPRIGHT", -BORDER, -BORDER)
    bar:SetHeight(BAR_HEIGHT)
    window.title = Theme.Text(window, "pixel", 13, "ivory")
    window.title:SetPoint("LEFT", bar, "LEFT", PADDING, 0)
    local tag = Theme.Text(window, "textHeavy", 10, "ember")
    tag:SetPoint("RIGHT", bar, "RIGHT", -PADDING, 0)
    tag:SetText("ARTISANS")
    buildLive()
    buildSummary()
end

local function look(state)
    local background, light, shade, label, color = unpack(LOOKS[state])
    button.background:SetColorTexture(Theme.Color(background))
    for index, edge in ipairs(button.edges) do
        edge:SetColorTexture(Theme.Color(index <= 2 and light or shade))
    end
    button.label:SetText(label)
    button.label:SetTextColor(Theme.Color(color))
end

--- The status line of the state, and the button's image.
local function status(state, data)
    if state == "fishing" then
        local left = math.max(0, data.castEndsAt - GetTime())
        animate(button.icon, WAVES, data.castEndsAt - Session.CAST_SECONDS, true)
        button.progress:SetWidth(math.max(1, (BUTTON_WIDTH - 2 * BEVEL) * left / Session.CAST_SECONDS))
        return ("Guette le bouchon… %d s"):format(math.ceil(left)), "ivory"
    elseif state == "hooked" then
        animate(button.icon, SPLASH, hookedAt, false)
        return "Ferré !", "gold"
    elseif state == "caught" then
        local item = data.last or {}
        if item.icon ~= nil then
            button.icon:SetTexture(item.icon)
            button.icon:SetSize(ITEM_ICON, ITEM_ICON)
        else
            setImage(button.icon, FISH)
        end
        return "+1 · " .. (item.name or "une prise"), "gain"
    elseif state == "fight" then
        setImage(button.icon, POLE)
        if data.weaponsBack == false then
            button.label:SetText("Reprendre l'arme")
            return "Canne encore en main", "loss"
        end
        return "En combat", "muted"
    end
    setImage(button.icon, POLE)
    if data.far then
        return "Trop loin de l'eau", "loss"
    end
    return "Canne équipée · prête", "gain"
end

--- The banner: a fight (the weapons back, or the key to press), or the line out of the water.
local function banner(state, data)
    local line
    if state == "fight" then
        line = "Combat ! Session fermée après le combat"
        if data.weaponsBack == false then
            line = "Combat ! Appuie sur " .. Key.Current() .. " pour reprendre ton arme"
        elseif data.weaponsBack then
            line = "Combat ! Session fermée, arme rééquipée"
        end
    elseif state == "ready" and data.far then
        line = "Ta ligne n'a pas touché l'eau : approche-toi et relance"
    end
    live.banner:SetShown(line ~= nil)
    live.banner.label:SetText(line or "")
end

--- The lure: its time left on the pole, or its button when the bags hold one; the button changes out of combat.
local function lureLine()
    local left = Gear.LureLeft()
    if not InCombatLockdown() then
        lure:SetShown(lureInBags and left == nil)
    end
    if left ~= nil then
        return "Appât posé · " .. VXV.Remaining(left)
    end
    return lure:IsShown() and "" or "Aucun appât dans les sacs"
end

local function renderLive(state, data)
    look(state == "ready" and data.far and "far" or state)
    local line, color = status(state, data)
    live.status:SetText(line)
    live.status:SetTextColor(Theme.Color(color))
    button.key:SetText(Key.Current())
    button.progress:SetShown(state == "fishing")
    live.stats:SetText(("%s · %s"):format(VXV.Count(data.catches, "prise", "prises"),
        Session.Clock(time() - data.startedAt)))
    live.lure:SetText(lureLine())
    quit:SetShown(state ~= "fight")
    banner(state, data)
end

local function renderSummary()
    local last = Session.Last() or {}
    summary.catches:SetText(tostring(last.catches or 0))
    summary.time:SetText(Session.Clock(last.seconds or 0))
    summary.best:SetText(last.best and last.best.name and ("Meilleure prise : " .. last.best.name) or "Aucune prise")
    summary.weapons:SetText(last.weapons and "Arme rééquipée" or "")
    summary.reason:SetText(Session.Explain() or "")
end

--- Draws the running session again every moment (animations, the line's time), while it shows.
local function tick()
    local state, data = Session.State()
    ticking = state ~= "off" and window:IsShown()
    if ticking then
        renderLive(state, data)
        C_Timer.After(TICK_SECONDS, tick)
    end
end

--- Draws the window for the session's state: opened by a start, its summary at the end. Out of combat only for
--- what holds the secure buttons.
function SessionWindow.Render()
    local state, data = Session.State()
    if window == nil then
        if state == "off" then
            return
        end
        create()
    end
    if state == "hooked" and hookedAt == nil then
        hookedAt = GetTime()
    elseif state ~= "hooked" then
        hookedAt = nil
    end
    if InCombatLockdown() then
        if state ~= "off" then
            renderLive(state, data)
        end
        return
    end
    local running = state ~= "off"
    if not running and not wasRunning then
        -- The summary already showing follows what happens next (why the session stopped); a failed start shows
        -- nothing.
        if window:IsShown() then
            renderSummary()
        end
        return
    end
    wasRunning = running
    window.title:SetText(running and "Session de pêche" or "Session terminée")
    window:SetHeight(running and HEIGHT or SUMMARY_HEIGHT)
    live:SetShown(running)
    button:SetShown(running)
    lure:SetShown(running)
    summary:SetShown(not running)
    if running then
        lureInBags = Key.ArmLure()
        renderLive(state, data)
        if not ticking then
            ticking = true
            C_Timer.After(TICK_SECONDS, tick)
        end
    else
        renderSummary()
    end
    window:Show()
end

VXV.On("fishing.changed", SessionWindow.Render)
