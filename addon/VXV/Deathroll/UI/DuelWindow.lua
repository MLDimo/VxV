local ns = select(2, ...).Deathroll

--- The duel's window (P15.4, P15.5, mockup AddonDeathroll): the two players in their class frames with their portrait,
--- plaque, titles and role, the turn's frame blinking gold; between them the VXV die, bobbing while it waits and
--- tumbling while a roll's digits scroll and slow down before stopping on the real result; the background from violet
--- to red as the high nears 0, the sounds of tension and defeat, the Roll button at the player's turn, the stakes
--- during the minute of bets, the rolls so far, then « VICTOIRE » and « A goûté le sol ». The same window follows the
--- game for its players and for every member who watches it, in two sizes (owner's request of 9 November): the
--- reduced one keeps the names, the number, the turn, the button and the bets.
local DuelWindow = {}
ns.DuelWindow = DuelWindow

local Duels, DuelView, Games, Rules = ns.Duels, ns.DuelView, ns.Games, ns.Rules

local Gold, Theme = VXV.Gold, VXV.Theme

local MEDIA = "Interface\\AddOns\\VXV\\Deathroll\\Media\\"
local SIZES = { full = { 760, 500 }, reduced = { 380, 250 } }
local PADDING, GAP = 8, 10
local SIDE_WIDTH, CARD_SIZE, CARD_TOP = 200, 112, 30
local NUMBER_SIZE, REDUCED_NUMBER_SIZE = 72, 40
local BUTTON_WIDTH, BUTTON_HEIGHT = 240, 40
local REDUCED_BUTTON_WIDTH, REDUCED_BUTTON_HEIGHT = 180, 28
local BAR_HEIGHT = 40
-- The width of the texts between the two sides, and in the reduced size.
local CENTER_WIDTH, REDUCED_WIDTH = 322, 342
local BET_WIDTH, BET_HEIGHT, AMOUNT_WIDTH, AMOUNT_LETTERS = 130, 28, 70, 7
-- The die (the website's d20, a quarter turn per image): its size, its bob while it waits (pixels up, a step every
-- BOB_STEP seconds), its tumble while a roll is drawn (an image and an offset every TUMBLE_STEP seconds).
local DIE = { file = "de-%d.png", frames = 4, width = 112, height = 128 }
local BOB, BOB_STEP = { 0, 3, 6, 8, 6, 3 }, 0.4
local TUMBLE, TUMBLE_STEP = { { 0, 0 }, { -6, 10 }, { 4, 0 }, { 6, 8 } }, 0.06
-- The scrolling digits: how long, how fast at first, and how much slower at the end (seconds between digits).
local ROLL_SECONDS, FIRST_STEP, LAST_STEP = 1.6, 0.04, 0.35
-- The last rolls, under this high, sound the tension.
local TENSION_HIGH = 10
local SOUNDS = { tension = "RAID_WARNING", defeat = "IG_QUEST_FAILED", victory = "IG_QUEST_LIST_COMPLETE" }
-- How much of its light a beaten player keeps.
local BEATEN_ALPHA = 0.6

local frame, body, shownId, animation, drawnBetting
local saved = {}
local full, reduced = {}, {}

local function playSound(name)
    local kit = VXV.Compat.Resolve("SOUNDKIT")
    local id = type(kit) == "table" and kit[SOUNDS[name]]
    if type(id) == "number" then
        VXV.Compat.PlaySound(id)
    end
end

--- A player's VXV titles (the Titles part answers), joined.
local function titlesOf(name)
    local titles = {}
    VXV.Emit("titles.request", name, function(held)
        titles = held
    end)
    return table.concat(titles, " · ")
end

local function classOf(name)
    for _, member in ipairs(VXV.GuildMembers()) do
        if member.name == name then
            return member.class
        end
    end
end

--- A text centred on its width, its lines wrapped.
local function centred(text, width)
    text:SetWidth(width)
    text:SetJustifyH("CENTER")
    return text
end

local function firstName(name)
    return name:match("^(%S+)") or name
end

--- The game as the window shows it: as it stood before the last roll while its digits scroll.
local function shown()
    local game = shownId and Games.Find(shownId)
    if game == nil then
        return nil
    end
    return animation and DuelView.Before(game) or game, game
end

--- A player's column: the card, the plaque with the name, the titles, the role, the result.
local function createSide(parent, anchor, x)
    local side = { card = VXV.PlayerCard(parent, CARD_SIZE) }
    side.card.frame:SetPoint("TOP", parent, anchor, x, -CARD_TOP)
    side.plaque = CreateFrame("Frame", nil, parent)
    side.plaque:SetSize(SIDE_WIDTH - 2 * PADDING, 30)
    side.plaque:SetPoint("TOP", side.card.frame, "BOTTOM", 0, -18)
    Theme.Fill(side.plaque, "wood"):SetAllPoints()
    Theme.Rings(side.plaque, { { "wood-shade", 3 }, { "copper", 3 } })
    side.name = Theme.Text(side.plaque, "pixelBold", 16, "ivory")
    side.name:SetPoint("CENTER")
    side.titles = Theme.Text(parent, "textBold", 11, "sakura-light")
    side.titles:SetPoint("TOP", side.plaque, "BOTTOM", 0, -10)
    side.role = Theme.Text(parent, "text", 11, "lavender")
    side.role:SetPoint("TOP", side.titles, "BOTTOM", 0, -6)
    side.result = Theme.Text(parent, "pixelBold", 22, "gold")
    side.result:SetPoint("TOP", side.role, "BOTTOM", 0, -16)
    side.gain = Theme.Text(parent, "textHeavy", 16, "gain")
    side.gain:SetPoint("TOP", side.result, "BOTTOM", 0, -4)
    return side
end

local function renderSide(side, game, name, me)
    local class = classOf(name)
    side.card.Set(name, class, VXV.DiceGames.Portrait(ns.DeathrollData.Current(), name))
    side.name:SetText(VXV.ClassColored(name, class))
    side.titles:SetText(titlesOf(name))
    side.role:SetText(DuelView.Role(game, name, me))
    local loser = Rules.Loser(game)
    side.result:SetText(loser == nil and "" or (loser == name and "A goûté le sol" or "VICTOIRE"))
    side.result:SetTextColor(Theme.Color(loser == name and "loss" or "gold"))
    side.gain:SetText(loser ~= nil and loser ~= name and Gold.Signed(game.stake) or "")
    for _, region in ipairs({ side.card.frame, side.plaque, side.role, side.titles }) do
        region:SetAlpha(loser == name and BEATEN_ALPHA or 1)
    end
end

--- The die: its bob while it waits, its tumble while a roll is drawn, red once the game is lost.
local function moveDie()
    local game = shown()
    if game == nil then
        return
    end
    local image, x, y = 1, 0, 0
    if animation ~= nil then
        local step = math.floor(GetTime() / TUMBLE_STEP)
        image = step % DIE.frames + 1
        x, y = unpack(TUMBLE[step % #TUMBLE + 1])
    elseif Rules.Loser(game) == nil then
        y = BOB[math.floor(GetTime() / BOB_STEP) % #BOB + 1]
    end
    local lost = Rules.Loser(game) ~= nil and animation == nil
    local state = table.concat({ image, x, y, tostring(lost) }, ";")
    if state == full.dieState then
        return
    end
    full.dieState = state
    local turned = image % 2 == 0
    full.die:SetTexture(MEDIA .. DIE.file:format(image), nil, nil, "NEAREST")
    full.die:SetSize(turned and DIE.height or DIE.width, turned and DIE.width or DIE.height)
    full.die:ClearAllPoints()
    full.die:SetPoint("CENTER", full.dieHolder, "CENTER", x, y)
    if lost then
        full.die:SetVertexColor(Theme.Color("loss"))
    else
        full.die:SetVertexColor(1, 1, 1, 1)
    end
end

--- The turn's card blinks gold, once the bets closed, while no roll is drawn.
local function blinkTurn()
    local game = shown()
    if game == nil then
        return
    end
    local roller = Rules.Turn(game)
    local waiting = not Rules.Betting(game) and animation == nil
    full.left.card.SetTurn(waiting and roller == game.challenger)
    full.right.card.SetTurn(waiting and roller == game.challenged)
end

--- What both sizes show: the number, the turn, the button, the stakes.
local function renderCommon(widgets, game, me)
    if animation == nil then
        widgets.number:SetText(DuelView.Number(game))
        widgets.number:SetTextColor(Theme.Color(Rules.Loser(game) and "loss" or "ivory"))
    end
    widgets.status:SetText(DuelView.Status(game, animation ~= nil))
    widgets.history:SetText(DuelView.History(game))
    local roller, high = Rules.Turn(game)
    widgets.roll:SetShown(roller == me and not Rules.Betting(game) and animation == nil)
    widgets.roll.label:SetText(("Roll (%d-%d)"):format(Rules.LOSING_ROLL, high or Rules.LOSING_ROLL))
    local betting = Rules.Betting(game) and me ~= game.challenger and me ~= game.challenged
    for _, widget in ipairs({ widgets.amountHolder, widgets.betLeft, widgets.betRight }) do
        widget:SetShown(betting)
    end
    widgets.betLeft.label:SetText("Miser sur " .. firstName(game.challenger))
    widgets.betRight.label:SetText("Miser sur " .. firstName(game.challenged))
end

local function render()
    local game = shown()
    if game == nil or frame == nil then
        return
    end
    local me = VXV.PlayerName()
    body.background:SetColorTexture(DuelView.Color(DuelView.Heat(game)))
    drawnBetting = Rules.Betting(game)
    if saved.reduced then
        reduced.names:SetText(("%s contre %s"):format(VXV.ClassColored(game.challenger, classOf(game.challenger)),
            VXV.ClassColored(game.challenged, classOf(game.challenged))))
        renderCommon(reduced, game, me)
    else
        full.stake:SetText("Mise " .. Gold.Format(game.stake))
        renderSide(full.left, game, game.challenger, me)
        renderSide(full.right, game, game.challenged, me)
        full.pot:SetText(DuelView.Pot(game))
        renderCommon(full, game, me)
        moveDie()
        blinkTurn()
    end
end

--- The digits scroll ever slower, then stop on the real result.
local function animate()
    if animation == nil then
        return
    end
    local now = GetTime()
    local progress = (now - animation.started) / ROLL_SECONDS
    if progress >= 1 then
        animation = nil
        render()
        local game = Games.Find(shownId)
        local loser = game and Rules.Loser(game)
        if loser ~= nil then
            playSound(loser == VXV.PlayerName() and "defeat" or "victory")
        end
        return
    end
    if now >= animation.next then
        local widgets = saved.reduced and reduced or full
        widgets.number:SetText(math.random(Rules.LOSING_ROLL, animation.high))
        animation.next = now + FIRST_STEP + (LAST_STEP - FIRST_STEP) * progress * progress
    end
end

--- The Roll button, the field and the two bet buttons of a size.
local function addControls(widgets, parent, buttonWidth, buttonHeight, bottom)
    widgets.roll = Theme.Button(parent, "gold", "Roll", buttonWidth, buttonHeight)
    widgets.roll:SetPoint("BOTTOM", 0, bottom)
    widgets.roll:SetScript("OnClick", function()
        Duels.Roll(shownId)
    end)
    widgets.betLeft = Theme.Button(parent, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betRight = Theme.Button(parent, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.amountHolder, widgets.amount = Theme.Field(parent, AMOUNT_WIDTH, AMOUNT_LETTERS)
    widgets.feedback = Theme.Text(parent, "text", 11, "muted")
    local function bet(choice)
        local refusal = Duels.Bet(shownId, choice(Games.Find(shownId)), widgets.amount:GetText())
        widgets.feedback:SetText(refusal or "Mise annoncée à la guilde.")
    end
    widgets.betLeft:SetScript("OnClick", function()
        bet(function(game)
            return game.challenger
        end)
    end)
    widgets.betRight:SetScript("OnClick", function()
        bet(function(game)
            return game.challenged
        end)
    end)
end

--- The full size: the badges, the two sides, the die and the number between them, the bar of the bets.
local function createFull()
    full.frame = CreateFrame("Frame", nil, body)
    full.frame:SetAllPoints()
    local parent = full.frame
    full.stake = Theme.Text(parent, "textHeavy", 12, "gold")
    full.stake:SetPoint("TOPRIGHT", -PADDING, -PADDING)
    full.left = createSide(parent, "TOPLEFT", SIDE_WIDTH / 2)
    full.right = createSide(parent, "TOPRIGHT", -SIDE_WIDTH / 2)
    full.dieHolder = CreateFrame("Frame", nil, parent)
    full.dieHolder:SetSize(DIE.height, DIE.height)
    full.dieHolder:SetPoint("TOP", 0, -GAP)
    full.die = full.dieHolder:CreateTexture(nil, "ARTWORK")
    full.number = Theme.Text(parent, "pixelBold", NUMBER_SIZE, "ivory")
    full.number:SetPoint("TOP", full.dieHolder, "BOTTOM", 0, -GAP)
    full.status = centred(Theme.Text(parent, "textBold", 14, "ivory"), CENTER_WIDTH)
    full.status:SetPoint("TOP", full.number, "BOTTOM", 0, -GAP)
    full.history = centred(Theme.Text(parent, "text", 12, "lavender"), CENTER_WIDTH)
    full.history:SetPoint("TOP", full.status, "BOTTOM", 0, -GAP)
    local bar = CreateFrame("Frame", nil, parent)
    bar:SetPoint("BOTTOMLEFT", 0, 0)
    bar:SetPoint("BOTTOMRIGHT", 0, 0)
    bar:SetHeight(BAR_HEIGHT)
    Theme.Fill(bar, "ink"):SetAllPoints()
    Theme.Rings(bar, { { "ink", 2 }, { "beam", 2 } })
    full.pot = Theme.Text(bar, "text", 12, "lavender")
    full.pot:SetPoint("LEFT", GAP, 0)
    addControls(full, parent, BUTTON_WIDTH, BUTTON_HEIGHT, BAR_HEIGHT + GAP)
    full.betRight:SetParent(bar)
    full.betRight:SetPoint("RIGHT", bar, "RIGHT", -GAP, 0)
    full.betLeft:SetParent(bar)
    full.betLeft:SetPoint("RIGHT", full.betRight, "LEFT", -GAP, 0)
    full.amountHolder:SetParent(bar)
    full.amountHolder:SetPoint("RIGHT", full.betLeft, "LEFT", -GAP, 0)
    full.feedback:SetPoint("BOTTOMRIGHT", bar, "TOPRIGHT", 0, 6)
end

--- The reduced size: the names, the number, the turn, the rolls, the button or the bets.
local function createReduced()
    reduced.frame = CreateFrame("Frame", nil, body)
    reduced.frame:SetAllPoints()
    local parent = reduced.frame
    reduced.names = Theme.Text(parent, "pixel", 14, "ivory")
    reduced.names:SetPoint("TOP", 0, -2)
    reduced.number = Theme.Text(parent, "pixelBold", REDUCED_NUMBER_SIZE, "ivory")
    reduced.number:SetPoint("TOP", reduced.names, "BOTTOM", 0, -GAP)
    reduced.status = centred(Theme.Text(parent, "textBold", 12, "ivory"), REDUCED_WIDTH)
    reduced.status:SetPoint("TOP", reduced.number, "BOTTOM", 0, -GAP / 2)
    reduced.history = centred(Theme.Text(parent, "text", 11, "lavender"), REDUCED_WIDTH)
    reduced.history:SetPoint("TOP", reduced.status, "BOTTOM", 0, -GAP / 2)
    addControls(reduced, parent, REDUCED_BUTTON_WIDTH, REDUCED_BUTTON_HEIGHT, 0)
    reduced.betRight:SetPoint("BOTTOMRIGHT", 0, 0)
    reduced.betLeft:SetPoint("RIGHT", reduced.betRight, "LEFT", -GAP / 2, 0)
    reduced.amountHolder:SetPoint("RIGHT", reduced.betLeft, "LEFT", -GAP / 2, 0)
    reduced.feedback:SetPoint("BOTTOM", 0, BET_HEIGHT + 4)
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
    frame, body = VXV.CreateDialog("VXV_DuelWindow", SIZES.full[1], SIZES.full[2], "Deathroll", function()
        saved.reduced = not saved.reduced
        applySize()
    end)
    body.background = body:CreateTexture(nil, "BACKGROUND")
    body.background:SetAllPoints()
    createFull()
    createReduced()
    frame:SetScript("OnUpdate", function()
        animate()
        local game = shown()
        if game == nil then
            return
        end
        if Rules.Betting(game) ~= drawnBetting then
            render()
        elseif drawnBetting then
            local widgets = saved.reduced and reduced or full
            widgets.status:SetText(DuelView.Status(game, false))
        end
        if not saved.reduced then
            moveDie()
            blinkTurn()
        end
    end)
end

--- Takes the module's saved data: the size the player chose.
function DuelWindow.Restore(data)
    saved = data
end

--- Opens the window on a game: its players, its watchers.
function DuelWindow.Show(id)
    if frame == nil then
        create()
    end
    shownId, animation = id, nil
    full.feedback:SetText("")
    reduced.feedback:SetText("")
    applySize()
    frame:Show()
end

-- A roll scrolls before it shows; the last ones sound the tension.
VXV.On("deathroll.rolled", function(id)
    local game = Games.Find(id)
    local last = game and game.rolls[#game.rolls]
    if frame == nil or id ~= shownId or last == nil then
        return
    end
    animation = { started = GetTime(), next = 0, high = last.high }
    if last.high <= TENSION_HIGH then
        playSound("tension")
    end
    render()
end)

-- The players see their game, the others hear of it: once the player's fight is over, while the game goes on.
VXV.On("deathroll.started", function(id)
    VXV.AfterCombat(function()
        local game, me = Games.Find(id), VXV.PlayerName()
        if game ~= nil and Rules.Turn(game) ~= nil and (me == game.challenger or me == game.challenged) then
            DuelWindow.Show(id)
        end
    end)
end)

-- The guild's announcement of a game (Duels.lua) opens it for the members who click its link.
VXV.OnChatLink("deathroll", function(players)
    local challenger, challenged = players:match("^(.-):(.*)$")
    for _, game in ipairs(Games.Live()) do
        if game.challenger == challenger and game.challenged == challenged then
            DuelWindow.Show(game.id)
            return
        end
    end
    VXV.Print(("Le deathroll %s contre %s est fini."):format(challenger or "?", challenged or "?"))
end)

VXV.On("deathroll.updated", render)
