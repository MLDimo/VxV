local ns = select(2, ...).Chifoumi

--- The game's window, as the mockup AddonChifoumi draws it: each player in a frame of their class color with their
--- portrait, their name on a plaque, their role and the rounds they won; between them the arena, each move sealed, then
--- « Chi… Fou… Mi ! » and both moves, the winner's in gold; the three moves to play, the rounds so far, and the guild's
--- stakes at the bottom. It opens for the players once their fight is over; the other members open it from the Chi Fou
--- Mi tab or the link of the guild's announcement, to watch and bet (no window comes to them on its own). Two sizes
--- (owner's request of 9 November): the reduced one keeps the score, the round, the moves and the bets.
local MatchWindow = {}
ns.MatchWindow = MatchWindow

local ChifoumiData, Games, Matches, MatchView, Rules = ns.ChifoumiData, ns.Games, ns.Matches, ns.MatchView, ns.Rules

local Gold, Theme = VXV.Gold, VXV.Theme

local MEDIA = "Interface\\AddOns\\VXV\\Chifoumi\\Media\\"
local IMAGES = { pierre = MEDIA .. "pierre.png", feuille = MEDIA .. "feuille.png", ciseaux = MEDIA .. "ciseaux.png",
    seal = MEDIA .. "scelle.png" }

local SIZES = { full = { 880, 560 }, reduced = { 420, 300 } }
local PADDING, GAP = 12, 10
local SIDE_WIDTH, SIDE_TOP = 200, 44
local FRAME_SIZE = 112
local PIP_SIZE, PIPS_GAP = 12, 6
local SLOT_SIZE, MOVE_SIZE, SLOTS_GAP, VERSUS_WIDTH = 118, 88, 24, 110
-- The moves to play: in the full size with what each beats, smaller in the reduced one.
local FULL_CHOICE = { width = 120, height = 96, icon = 48, margin = 8, text = 15, hint = true }
local REDUCED_CHOICE = { width = 96, height = 64, icon = 32, margin = 4, text = 12 }
local BAR_HEIGHT = 44
local BET_WIDTH, BET_HEIGHT, AMOUNT_WIDTH, AMOUNT_LETTERS = 130, 28, 80, 7
-- How often the window redraws while a round is revealed or the bets are open.
local REDRAW_SECONDS = 0.1
-- How much of its light a beaten player keeps.
local BEATEN_ALPHA = 0.6

local frame, body, shownId, redrawAt
local saved = {}
local full, reduced = {}, {}

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

local function firstName(name)
    return name:match("^(%S+)") or name
end

local function classOf(name)
    for _, member in ipairs(VXV.GuildMembers()) do
        if member.name == name then
            return member.class
        end
    end
end

--- A player's column: the card, the plaque, the role, the rounds won, the result.
local function createSide(anchor, x)
    local side = { card = VXV.PlayerCard(full.frame, FRAME_SIZE) }
    side.card.frame:SetPoint("TOP", full.frame, anchor, x, -SIDE_TOP)
    side.plaque = CreateFrame("Frame", nil, full.frame)
    side.plaque:SetSize(SIDE_WIDTH - 2 * PADDING, 30)
    side.plaque:SetPoint("TOP", side.card.frame, "BOTTOM", 0, -20)
    Theme.Fill(side.plaque, "wood"):SetAllPoints()
    Theme.Rings(side.plaque, { { "wood-shade", 3 }, { "copper", 3 } })
    side.name = Theme.Text(side.plaque, "pixelBold", 17, "ivory")
    side.name:SetPoint("CENTER")
    side.role = Theme.Text(full.frame, "text", 11, "lavender")
    side.role:SetPoint("TOP", side.plaque, "BOTTOM", 0, -12)
    local rounds = Theme.Text(full.frame, "textHeavy", 10, "muted")
    rounds:SetPoint("TOPRIGHT", side.role, "BOTTOM", -4, -10)
    rounds:SetText(Theme.Upper("Manches"))
    side.pips = {}
    for index = 1, Rules.ROUNDS_TO_WIN do
        local pip = CreateFrame("Frame", nil, full.frame)
        pip:SetSize(PIP_SIZE, PIP_SIZE)
        pip:SetPoint("LEFT", rounds, "RIGHT", PIPS_GAP + (index - 1) * (PIP_SIZE + PIPS_GAP), 0)
        side.pips[index] = Theme.Fill(pip, "wood-tab", "ARTWORK")
        side.pips[index]:SetAllPoints()
        Theme.Rings(pip, { { "ink", 2 } })
    end
    side.result = Theme.Text(full.frame, "pixelBold", 22, "gold")
    side.result:SetPoint("TOP", side.role, "BOTTOM", 0, -40)
    side.gain = Theme.Text(full.frame, "textHeavy", 16, "gain")
    side.gain:SetPoint("TOP", side.result, "BOTTOM", 0, -4)
    return side
end

local function renderSide(side, game, name, me, phase)
    local token = classOf(name)
    side.card.Set(name, token, ChifoumiData.PortraitOf(name))
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
    for _, region in ipairs({ side.card.frame, side.plaque, side.role }) do
        region:SetAlpha(beaten and BEATEN_ALPHA or 1)
    end
end

--- A slot of the arena: the move's picture (or the seal, or « ? »), its ring, its label.
local function createSlot(arena, side)
    local slot = CreateFrame("Frame", nil, full.frame)
    slot:SetSize(SLOT_SIZE, SLOT_SIZE)
    slot:SetPoint(side, arena, side)
    Theme.Fill(slot, "card", "ARTWORK"):SetAllPoints()
    slot.rings = Theme.Rings(slot, { { "ink", 3 }, { "copper", 4 }, { "ink", 3 } })
    slot.image = picture(slot, MOVE_SIZE)
    slot.empty = Theme.Text(slot, "pixelBold", 56, "muted")
    slot.empty:SetPoint("CENTER")
    slot.empty:SetText("?")
    slot.label = Theme.Text(full.frame, "textHeavy", 11, "lavender")
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

--- A move to play: its picture, its name, and in the full size what it beats.
local function createChoice(parent, move, size)
    local button = CreateFrame("Button", nil, parent)
    button:SetSize(size.width, size.height)
    local background = Theme.Fill(button, "wood-tab")
    background:SetAllPoints()
    local ring = Theme.Rings(button, { { "copper", 2 }, { "ink", 2 } }, true)[1]
    local icon = button:CreateTexture(nil, "ARTWORK")
    icon:SetSize(size.icon, size.icon)
    icon:SetPoint("TOP", 0, -size.margin)
    setPicture(icon, IMAGES[move])
    button.label = Theme.Text(button, "pixelBold", size.text, "ivory")
    button.label:SetPoint("TOP", icon, "BOTTOM", 0, -2)
    button.label:SetText(Rules.MOVE_NAMES[move])
    if size.hint then
        local hint = Theme.Text(button, "text", 10, "old-paper")
        hint:SetPoint("TOP", button.label, "BOTTOM", 0, -2)
        hint:SetText(MatchView.HINTS[move])
    end
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

--- The three moves of a size, side by side under its status.
local function addChoices(widgets, parent, size)
    local x = -(#Rules.MOVES - 1) * (size.width + GAP) / 2
    for _, move in ipairs(Rules.MOVES) do
        widgets[move] = createChoice(parent, move, size)
        widgets[move]:SetPoint("TOP", widgets.status, "BOTTOM", x, -GAP)
        x = x + size.width + GAP
    end
end

--- What both sizes show: the status, the moves to play, the rounds so far, the stakes and the bets.
local function renderCommon(widgets, game, me, phase, now, left, right)
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
    widgets.betLeft:SetText("Miser sur " .. firstName(left))
    widgets.betRight:SetText("Miser sur " .. firstName(right))
    widgets.betLeft.choice, widgets.betRight.choice = left, right
end

local function render()
    local game = shownId and Games.Find(shownId)
    if not game or frame == nil then
        return
    end
    local me, now = VXV.PlayerName(), GetTime()
    local phase, word = MatchView.Phase(game, now)
    local left, right = MatchView.Sides(game, me)
    if saved.reduced then
        reduced.score:SetText(("%s  %d – %d  %s"):format(VXV.ClassColored(left, classOf(left)),
            MatchView.RoundsWon(game, left), MatchView.RoundsWon(game, right), VXV.ClassColored(right, classOf(right))))
        local versus = MatchView.Versus(game, left, phase, word)
        reduced.round:SetText(MatchView.RoundLabel(game, left, right, phase) .. " · " .. versus)
        renderCommon(reduced, game, me, phase, now, left, right)
        return
    end
    full.stake:SetText("Mise " .. Gold.Format(game.stake))
    renderSide(full.left, game, left, me, phase)
    renderSide(full.right, game, right, me, phase)
    full.round:SetText(MatchView.RoundLabel(game, left, right, phase))
    local myMove = Matches.MyMove(game.id)
    renderSlot(full.leftSlot, MatchView.Slot(game, left, me, phase, myMove))
    renderSlot(full.rightSlot, MatchView.Slot(game, right, me, phase, myMove))
    local versus, color = MatchView.Versus(game, left, phase, word)
    full.versus:SetText(versus)
    full.versus:SetTextColor(Theme.Color(color))
    renderCommon(full, game, me, phase, now, left, right)
end

--- The bets of a size: the field and the two buttons, their answer under feedbackParent.
local function addBets(widgets, parent, feedbackParent)
    widgets.betRight = Theme.Button(parent, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betLeft = Theme.Button(parent, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.amountHolder, widgets.amount = Theme.Field(parent, AMOUNT_WIDTH, AMOUNT_LETTERS)
    widgets.feedback = Theme.Text(feedbackParent, "text", 11, "muted")
    local function bet(button)
        local refusal = Matches.Bet(shownId, button.choice, widgets.amount:GetText())
        widgets.feedback:SetText(refusal or "Mise annoncée à la guilde.")
    end
    for _, button in ipairs({ widgets.betLeft, widgets.betRight }) do
        button:SetScript("OnClick", bet)
    end
end

--- The full size, as the mockup: the badges, the two sides, the arena, the moves, the bar of the bets.
local function createFull()
    full.frame = CreateFrame("Frame", nil, body)
    full.frame:SetAllPoints()
    local parent = full.frame
    full.stake = Theme.Text(parent, "textHeavy", 12, "gold")
    full.stake:SetPoint("TOPRIGHT", -PADDING, -8)
    local rounds = Theme.Text(parent, "textHeavy", 12, "amethyst-light")
    rounds:SetPoint("RIGHT", full.stake, "LEFT", -2 * GAP, 0)
    rounds:SetText("Au meilleur des 3")
    full.left = createSide("TOPLEFT", SIDE_WIDTH / 2)
    full.right = createSide("TOPRIGHT", -SIDE_WIDTH / 2)
    full.round = Theme.Text(parent, "pixel", 17, "gold-light")
    full.round:SetPoint("TOP", 0, -SIDE_TOP)
    local arena = CreateFrame("Frame", nil, parent)
    arena:SetSize(2 * SLOT_SIZE + 2 * SLOTS_GAP + VERSUS_WIDTH, SLOT_SIZE)
    arena:SetPoint("TOP", full.round, "BOTTOM", 0, -18)
    full.versus = Theme.Text(arena, "pixelBold", 40, "sakura")
    full.versus:SetPoint("CENTER")
    full.leftSlot = createSlot(arena, "LEFT")
    full.rightSlot = createSlot(arena, "RIGHT")
    full.status = Theme.Text(parent, "textHeavy", 13, "ivory")
    full.status:SetPoint("TOP", arena, "BOTTOM", 0, -36)
    addChoices(full, parent, FULL_CHOICE)
    full.history = Theme.Text(parent, "text", 11, "lavender")
    full.history:SetPoint("BOTTOM", 0, PADDING + BAR_HEIGHT + 2 * GAP)
    full.history:SetJustifyH("CENTER")
    local bar = CreateFrame("Frame", nil, parent)
    bar:SetPoint("BOTTOMLEFT", PADDING, PADDING)
    bar:SetPoint("BOTTOMRIGHT", -PADDING, PADDING)
    bar:SetHeight(BAR_HEIGHT)
    Theme.Fill(bar, "ink"):SetAllPoints()
    Theme.Rings(bar, { { "ink", 2 }, { "beam", 2 } })
    full.bets = Theme.Text(bar, "text", 12, "lavender")
    full.bets:SetPoint("LEFT", GAP, 0)
    addBets(full, bar, parent)
    full.betRight:SetPoint("RIGHT", -GAP, 0)
    full.betLeft:SetPoint("RIGHT", full.betRight, "LEFT", -GAP, 0)
    full.amountHolder:SetPoint("RIGHT", full.betLeft, "LEFT", -GAP, 0)
    full.feedback:SetPoint("BOTTOMRIGHT", bar, "TOPRIGHT", 0, 6)
end

--- The reduced size: the score between the names, the round, the status, the moves, the rounds so far, the bets.
local function createReduced()
    reduced.frame = CreateFrame("Frame", nil, body)
    reduced.frame:SetAllPoints()
    local parent = reduced.frame
    reduced.score = Theme.Text(parent, "pixel", 14, "ivory")
    reduced.score:SetPoint("TOP", 0, -2)
    reduced.round = Theme.Text(parent, "textBold", 12, "gold-light")
    reduced.round:SetPoint("TOP", reduced.score, "BOTTOM", 0, -GAP / 2)
    reduced.status = Theme.Text(parent, "textHeavy", 12, "ivory")
    reduced.status:SetPoint("TOP", reduced.round, "BOTTOM", 0, -GAP / 2)
    addChoices(reduced, parent, REDUCED_CHOICE)
    reduced.bets = Theme.Text(parent, "text", 11, "lavender")
    reduced.bets:SetPoint("BOTTOM", 0, BET_HEIGHT + 4)
    reduced.history = Theme.Text(parent, "text", 10, "lavender")
    reduced.history:SetPoint("BOTTOM", reduced.bets, "TOP", 0, 4)
    reduced.history:SetJustifyH("CENTER")
    addBets(reduced, parent, parent)
    reduced.betRight:SetPoint("BOTTOMRIGHT", 0, 0)
    reduced.betLeft:SetPoint("RIGHT", reduced.betRight, "LEFT", -GAP / 2, 0)
    reduced.amountHolder:SetPoint("RIGHT", reduced.betLeft, "LEFT", -GAP / 2, 0)
    reduced.feedback:SetPoint("BOTTOM", reduced.history, "TOP", 0, 4)
end

--- Shows the size the player chose last.
local function applySize()
    local size = SIZES[saved.reduced and "reduced" or "full"]
    VXV.ResizeDialog(frame, body, size[1], size[2], saved.reduced)
    full.frame:SetShown(not saved.reduced)
    reduced.frame:SetShown(saved.reduced == true)
    render()
end

local function create()
    frame, body = VXV.CreateDialog("VXV_ChifoumiWindow", SIZES.full[1], SIZES.full[2], "Chi Fou Mi", function()
        saved.reduced = not saved.reduced
        applySize()
    end)
    createFull()
    createReduced()
    -- The reveal's countdown, the bets' countdown, then the next round's moves.
    frame:SetScript("OnUpdate", function()
        local game = shownId and Games.Find(shownId)
        if game ~= nil and GetTime() >= (redrawAt or 0) then
            redrawAt = GetTime() + REDRAW_SECONDS
            render()
        end
    end)
end

--- Takes the module's saved data: the size the player chose.
function MatchWindow.Restore(data)
    saved = data
end

--- Opens the window on a game: its players, its watchers.
function MatchWindow.Show(id)
    if frame == nil then
        create()
    end
    shownId, redrawAt = id, nil
    full.feedback:SetText("")
    reduced.feedback:SetText("")
    applySize()
    frame:Show()
end

-- The players see their game once their fight is over, while it goes on; nothing comes to the others on its own.
VXV.On("chifoumi.started", function(id)
    VXV.AfterCombat(function()
        local game, me = Games.Find(id), VXV.PlayerName()
        if Games.IsLive(game) and (me == game.challenger or me == game.challenged) then
            MatchWindow.Show(id)
        end
    end)
end)

-- The guild's announcement of a game (Matches.lua) opens it for the members who click its link.
VXV.OnChatLink("chifoumi", function(players)
    local challenger, challenged = players:match("^(.-):(.*)$")
    for _, game in ipairs(Games.Live()) do
        if game.challenger == challenger and game.challenged == challenged then
            MatchWindow.Show(game.id)
            return
        end
    end
    VXV.Print(("Le Chi Fou Mi %s contre %s est fini."):format(challenger or "?", challenged or "?"))
end)

VXV.On("chifoumi.updated", render)
