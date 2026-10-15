local ns = select(2, ...).Chifoumi

--- The game's window, as the mockup AddonChifoumi draws it: each player in a frame of their class color with their
--- portrait, their name on a plaque, their role and the rounds they won; between them the arena, each move sealed, then
--- « Chi… Fou… Mi ! » and both moves, the winner's in gold; the three moves to play, the rounds so far, and the guild's
--- stakes at the bottom. It opens for the players once their fight is over; the other members open it from the Chi Fou
--- Mi tab to watch and bet (no window comes to them on its own).
local MatchWindow = {}
ns.MatchWindow = MatchWindow

local ChifoumiData, Games, Matches, MatchView, Rules = ns.ChifoumiData, ns.Games, ns.Matches, ns.MatchView, ns.Rules

local Gold, Theme = VXV.Gold, VXV.Theme

local MEDIA = "Interface\\AddOns\\VXV\\Chifoumi\\Media\\"
local IMAGES = { pierre = MEDIA .. "pierre.png", feuille = MEDIA .. "feuille.png", ciseaux = MEDIA .. "ciseaux.png",
    seal = MEDIA .. "scelle.png" }

local WIDTH, HEIGHT = 880, 560
local PADDING, GAP = 12, 10
local SIDE_WIDTH, SIDE_TOP = 200, 44
local FRAME_SIZE, PORTRAIT_SIZE, INITIAL_SIZE = 112, 98, 48
local PIP_SIZE, PIPS_GAP = 12, 6
local SLOT_SIZE, MOVE_SIZE, SLOTS_GAP, VERSUS_WIDTH = 118, 88, 24, 110
local CHOICE_WIDTH, CHOICE_HEIGHT, CHOICE_ICON = 120, 96, 48
local BAR_HEIGHT = 44
local BET_WIDTH, BET_HEIGHT, AMOUNT_WIDTH, AMOUNT_LETTERS = 170, 28, 80, 7
-- How often the window redraws while a round is revealed or the bets are open.
local REDRAW_SECONDS = 0.1
-- How much of its light a beaten player keeps.
local BEATEN_ALPHA = 0.6

local frame, body, shownId, redrawAt
local widgets = {}

--- A texture of the part's pixel art, sharp at any size (measured on 5 October).
local function picture(parent, size, layer)
    local image = parent:CreateTexture(nil, layer or "OVERLAY")
    image:SetSize(size, size)
    image:SetPoint("CENTER")
    return image
end

local function setPicture(image, file)
    image:SetTexture(file, nil, nil, "NEAREST")
end

local function classOf(name)
    for _, member in ipairs(VXV.GuildMembers()) do
        if member.name == name then
            return member.class
        end
    end
end

--- A player's column: the frame and portrait, the plaque, the role, the rounds won, the result.
local function createSide(anchor, x)
    local side = {}
    side.frame = CreateFrame("Frame", nil, body)
    side.frame:SetSize(FRAME_SIZE, FRAME_SIZE)
    side.frame:SetPoint("TOP", body, anchor, x, -SIDE_TOP)
    side.color = Theme.Fill(side.frame, "copper", "ARTWORK")
    side.color:SetAllPoints()
    Theme.Rings(side.frame, { { "ink", 3 }, { "copper", 4 }, { "ink", 3 } })
    local ground = Theme.Fill(side.frame, "avatar-ground", "ARTWORK")
    ground:SetSize(PORTRAIT_SIZE, PORTRAIT_SIZE)
    ground:SetPoint("CENTER")
    side.portrait = picture(side.frame, PORTRAIT_SIZE)
    side.initial = Theme.Text(side.frame, "pixelBold", INITIAL_SIZE, "banner-ink")
    side.initial:SetPoint("CENTER")
    side.plaque = CreateFrame("Frame", nil, body)
    side.plaque:SetSize(SIDE_WIDTH - 2 * PADDING, 30)
    side.plaque:SetPoint("TOP", side.frame, "BOTTOM", 0, -20)
    Theme.Fill(side.plaque, "wood"):SetAllPoints()
    Theme.Rings(side.plaque, { { "wood-shade", 3 }, { "copper", 3 } })
    side.name = Theme.Text(side.plaque, "pixelBold", 17, "ivory")
    side.name:SetPoint("CENTER")
    side.role = Theme.Text(body, "text", 11, "lavender")
    side.role:SetPoint("TOP", side.plaque, "BOTTOM", 0, -12)
    local rounds = Theme.Text(body, "textHeavy", 10, "muted")
    rounds:SetPoint("TOPRIGHT", side.role, "BOTTOM", -4, -10)
    rounds:SetText(Theme.Upper("Manches"))
    side.pips = {}
    for index = 1, Rules.ROUNDS_TO_WIN do
        local pip = CreateFrame("Frame", nil, body)
        pip:SetSize(PIP_SIZE, PIP_SIZE)
        pip:SetPoint("LEFT", rounds, "RIGHT", PIPS_GAP + (index - 1) * (PIP_SIZE + PIPS_GAP), 0)
        side.pips[index] = Theme.Fill(pip, "wood-tab", "ARTWORK")
        side.pips[index]:SetAllPoints()
        Theme.Rings(pip, { { "ink", 2 } })
    end
    side.result = Theme.Text(body, "pixelBold", 22, "gold")
    side.result:SetPoint("TOP", side.role, "BOTTOM", 0, -40)
    side.gain = Theme.Text(body, "textHeavy", 16, "gain")
    side.gain:SetPoint("TOP", side.result, "BOTTOM", 0, -4)
    return side
end

local function renderSide(side, game, name, me, phase)
    local token = classOf(name)
    side.color:SetColorTexture(Theme.ClassColor(token))
    local portrait = ChifoumiData.PortraitOf(name)
    if portrait ~= nil then
        setPicture(side.portrait, portrait)
    end
    side.portrait:SetShown(portrait ~= nil)
    side.initial:SetText(portrait == nil and name:sub(1, 1) or "")
    side.name:SetText(VXV.ClassColored(name, token))
    side.role:SetText(MatchView.Role(game, name, me))
    local won = MatchView.RoundsWon(game, name)
    for index, pip in ipairs(side.pips) do
        pip:SetColorTexture(Theme.Color(index <= won and "gold" or "wood-tab"))
    end
    local winner = phase == "done" and Rules.Winner(game) or nil
    side.result:SetText(winner == nil and "" or (winner == name and "VICTOIRE" or "Plié en trois"))
    side.result:SetTextColor(Theme.Color(winner == name and "gold" or "loss"))
    side.gain:SetText(winner == name and game.stake > 0 and Gold.Signed(game.stake) or "")
    local beaten = winner ~= nil and winner ~= name
    for _, region in ipairs({ side.frame, side.plaque, side.role }) do
        region:SetAlpha(beaten and BEATEN_ALPHA or 1)
    end
end

--- A slot of the arena: the move's picture (or the seal, or « ? »), its ring, its label.
local function createSlot(arena, side)
    local slot = CreateFrame("Frame", nil, body)
    slot:SetSize(SLOT_SIZE, SLOT_SIZE)
    slot:SetPoint(side, arena, side)
    Theme.Fill(slot, "card", "ARTWORK"):SetAllPoints()
    slot.rings = Theme.Rings(slot, { { "ink", 3 }, { "copper", 4 }, { "ink", 3 } })
    slot.image = picture(slot, MOVE_SIZE)
    slot.empty = Theme.Text(slot, "pixelBold", 56, "muted")
    slot.empty:SetPoint("CENTER")
    slot.empty:SetText("?")
    slot.label = Theme.Text(body, "textHeavy", 11, "lavender")
    slot.label:SetPoint("TOP", slot, "BOTTOM", 0, -14)
    return slot
end

local function renderSlot(slot, shown)
    local file = shown.sealed and IMAGES.seal or (shown.move and IMAGES[shown.move])
    if file ~= nil then
        setPicture(slot.image, file)
    end
    slot.image:SetShown(file ~= nil)
    slot.empty:SetShown(file == nil)
    Theme.Recolor(slot.rings[2], shown.won and "gold" or (shown.lost and "line" or "copper"))
    slot:SetAlpha(shown.lost and BEATEN_ALPHA or 1)
    slot.label:SetText(shown.label)
    slot.label:SetTextColor(Theme.Color(shown.won and "gold" or "lavender"))
end

--- A move to play: its picture, its name, what it beats.
local function createChoice(move, x)
    local button = CreateFrame("Button", nil, body)
    button:SetSize(CHOICE_WIDTH, CHOICE_HEIGHT)
    button:SetPoint("TOP", widgets.status, "BOTTOM", x, -GAP)
    local background = Theme.Fill(button, "wood-tab")
    background:SetAllPoints()
    local ring = Theme.Rings(button, { { "copper", 2 }, { "ink", 2 } }, true)[1]
    local icon = button:CreateTexture(nil, "ARTWORK")
    icon:SetSize(CHOICE_ICON, CHOICE_ICON)
    icon:SetPoint("TOP", 0, -8)
    setPicture(icon, IMAGES[move])
    button.label = Theme.Text(button, "pixelBold", 15, "ivory")
    button.label:SetPoint("TOP", icon, "BOTTOM", 0, -4)
    button.label:SetText(Rules.MOVE_NAMES[move])
    local hint = Theme.Text(button, "text", 10, "old-paper")
    hint:SetPoint("TOP", button.label, "BOTTOM", 0, -2)
    hint:SetText(MatchView.HINTS[move])
    button:SetScript("OnEnter", function()
        background:SetColorTexture(Theme.Color("plum"))
        Theme.Recolor(ring, "gold")
    end)
    button:SetScript("OnLeave", function()
        background:SetColorTexture(Theme.Color("wood-tab"))
        Theme.Recolor(ring, "copper")
    end)
    button:SetScript("OnClick", function()
        Matches.Play(shownId, move)
    end)
    return button
end

local function render()
    local game = shownId and Games.Find(shownId)
    if not game or frame == nil then
        return
    end
    local me, now = VXV.PlayerName(), GetTime()
    local phase, word = MatchView.Phase(game, now)
    local left, right = MatchView.Sides(game, me)
    widgets.stake:SetText("Mise " .. Gold.Format(game.stake))
    renderSide(widgets.left, game, left, me, phase)
    renderSide(widgets.right, game, right, me, phase)
    widgets.round:SetText(MatchView.RoundLabel(game, left, right, phase))
    local myMove = Matches.MyMove(game.id)
    renderSlot(widgets.leftSlot, MatchView.Slot(game, left, me, phase, myMove))
    renderSlot(widgets.rightSlot, MatchView.Slot(game, right, me, phase, myMove))
    local versus, color = MatchView.Versus(game, left, phase, word)
    widgets.versus:SetText(versus)
    widgets.versus:SetTextColor(Theme.Color(color))
    widgets.status:SetText(MatchView.Status(game, me, phase, now))
    local canPlay = phase == "choose" and Games.Awaits(game, me)
    for _, move in ipairs(Rules.MOVES) do
        widgets[move]:SetShown(canPlay)
    end
    widgets.history:SetText(MatchView.History(game))
    widgets.bets:SetText(MatchView.Bets(game, left, right))
    local betting = phase == "betting" and me ~= game.challenger and me ~= game.challenged
    for _, widget in ipairs({ widgets.amountHolder, widgets.betLeft, widgets.betRight }) do
        widget:SetShown(betting)
    end
    widgets.betLeft:SetText("Miser sur " .. left)
    widgets.betRight:SetText("Miser sur " .. right)
    widgets.betLeft.choice, widgets.betRight.choice = left, right
end

local function bet(button)
    local refusal = Matches.Bet(shownId, button.choice, widgets.amount:GetText())
    widgets.feedback:SetText(refusal or "Mise annoncée à la guilde.")
end

--- The badges at the top: the stake, the rounds.
local function addBadges()
    widgets.stake = Theme.Text(body, "textHeavy", 12, "gold")
    widgets.stake:SetPoint("TOPRIGHT", -PADDING, -8)
    local rounds = Theme.Text(body, "textHeavy", 12, "amethyst-light")
    rounds:SetPoint("RIGHT", widgets.stake, "LEFT", -2 * GAP, 0)
    rounds:SetText("Au meilleur des 3")
end

--- The bar at the bottom: the guild's stakes, and during the minute of bets the field and the two buttons.
local function addBar()
    local bar = CreateFrame("Frame", nil, body)
    bar:SetPoint("BOTTOMLEFT", PADDING, PADDING)
    bar:SetPoint("BOTTOMRIGHT", -PADDING, PADDING)
    bar:SetHeight(BAR_HEIGHT)
    Theme.Fill(bar, "ink"):SetAllPoints()
    Theme.Rings(bar, { { "ink", 2 }, { "beam", 2 } })
    widgets.bets = Theme.Text(bar, "text", 12, "lavender")
    widgets.bets:SetPoint("LEFT", GAP, 0)
    widgets.betRight = Theme.Button(bar, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betRight:SetPoint("RIGHT", -GAP, 0)
    widgets.betLeft = Theme.Button(bar, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betLeft:SetPoint("RIGHT", widgets.betRight, "LEFT", -GAP, 0)
    widgets.amountHolder, widgets.amount = Theme.Field(bar, AMOUNT_WIDTH, AMOUNT_LETTERS)
    widgets.amountHolder:SetPoint("RIGHT", widgets.betLeft, "LEFT", -GAP, 0)
    for _, button in ipairs({ widgets.betLeft, widgets.betRight }) do
        button:SetScript("OnClick", bet)
    end
    widgets.feedback = Theme.Text(body, "text", 11, "muted")
    widgets.feedback:SetPoint("BOTTOMRIGHT", bar, "TOPRIGHT", 0, 6)
end

local function create()
    frame, body = VXV.CreateDialog("VXV_ChifoumiWindow", WIDTH, HEIGHT, "Chi Fou Mi")
    addBadges()
    widgets.left = createSide("TOPLEFT", SIDE_WIDTH / 2)
    widgets.right = createSide("TOPRIGHT", -SIDE_WIDTH / 2)
    widgets.round = Theme.Text(body, "pixel", 17, "gold-light")
    widgets.round:SetPoint("TOP", 0, -SIDE_TOP)
    local arena = CreateFrame("Frame", nil, body)
    arena:SetSize(2 * SLOT_SIZE + 2 * SLOTS_GAP + VERSUS_WIDTH, SLOT_SIZE)
    arena:SetPoint("TOP", widgets.round, "BOTTOM", 0, -18)
    widgets.versus = Theme.Text(arena, "pixelBold", 40, "sakura")
    widgets.versus:SetPoint("CENTER")
    widgets.leftSlot = createSlot(arena, "LEFT")
    widgets.rightSlot = createSlot(arena, "RIGHT")
    widgets.status = Theme.Text(body, "textHeavy", 13, "ivory")
    widgets.status:SetPoint("TOP", arena, "BOTTOM", 0, -36)
    local x = -(#Rules.MOVES - 1) * (CHOICE_WIDTH + GAP) / 2
    for _, move in ipairs(Rules.MOVES) do
        widgets[move] = createChoice(move, x)
        x = x + CHOICE_WIDTH + GAP
    end
    widgets.history = Theme.Text(body, "text", 11, "lavender")
    widgets.history:SetPoint("BOTTOM", 0, PADDING + BAR_HEIGHT + 2 * GAP)
    widgets.history:SetJustifyH("CENTER")
    addBar()
    -- The reveal's countdown, the bets' countdown, then the next round's moves.
    frame:SetScript("OnUpdate", function()
        local game = shownId and Games.Find(shownId)
        if game ~= nil and GetTime() >= (redrawAt or 0) then
            redrawAt = GetTime() + REDRAW_SECONDS
            render()
        end
    end)
end

--- Opens the window on a game: its players, its watchers.
function MatchWindow.Show(id)
    if frame == nil then
        create()
    end
    shownId, redrawAt = id, nil
    widgets.feedback:SetText("")
    render()
    frame:Show()
end

-- The players see their game once their fight is over, while it goes on; nothing comes to the others.
VXV.On("chifoumi.started", function(id)
    VXV.AfterCombat(function()
        local game, me = Games.Find(id), VXV.PlayerName()
        if Games.IsLive(game) and (me == game.challenger or me == game.challenged) then
            MatchWindow.Show(id)
        end
    end)
end)

VXV.On("chifoumi.updated", render)
