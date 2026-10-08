local _, ns = ...

--- The duel's window (P15.4, P15.5): the two players with their titles, the big number that scrolls and slows down
--- before stopping on the real result, the background from violet to red as the high comes near 0, the sounds of
--- tension and defeat, the Roll button at the player's turn, the stakes during the minute of bets, the rolls so far.
--- The same window follows the game for its players and for every member who watches it.
local DuelWindow = {}
ns.DuelWindow = DuelWindow

local Duels, DuelView, Games, Rules = ns.Duels, ns.DuelView, ns.Games, ns.Rules

local Theme = VXV.Theme

local WIDTH, HEIGHT = 460, 440
local PADDING = 8
local NAME_TOP, TITLES_GAP = 4, 4
local NUMBER_SIZE = 64
local BUTTON_WIDTH, BUTTON_HEIGHT = 200, 34
local BET_WIDTH, BET_HEIGHT, AMOUNT_WIDTH, AMOUNT_LETTERS = 150, 28, 90, 7
-- The scrolling digits: how long, how fast at first, and how much slower at the end (seconds between digits).
local ROLL_SECONDS, FIRST_STEP, LAST_STEP = 1.6, 0.04, 0.35
-- The last rolls, under this high, sound the tension.
local TENSION_HIGH = 10
local SOUNDS = { tension = "RAID_WARNING", defeat = "IG_QUEST_FAILED", victory = "IG_QUEST_LIST_COMPLETE" }

-- Whether the window was drawn during the minute of bets: its end brings the Roll button.
local frame, body, shownId, animation, drawnBetting
local widgets = {}

local function playSound(name)
    local kit = VXV.Compat.Resolve("SOUNDKIT")
    local id = type(kit) == "table" and kit[SOUNDS[name]]
    if type(id) == "number" then
        VXV.Compat.PlaySound(id)
    end
end

--- A player's VXV titles (VXV_Titles answers when it is there), joined.
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

local function render()
    local game = shownId and Games.Find(shownId)
    if not game or frame == nil then
        return
    end
    local me = VXV.PlayerName()
    -- The challenged, who rolls first, on the left.
    widgets.left:SetText(VXV.ClassColored(game.challenged, classOf(game.challenged)))
    widgets.leftTitles:SetText(titlesOf(game.challenged))
    widgets.right:SetText(VXV.ClassColored(game.challenger, classOf(game.challenger)))
    widgets.rightTitles:SetText(titlesOf(game.challenger))
    widgets.background:SetColorTexture(DuelView.Color(DuelView.Heat(game)))
    if animation == nil then
        widgets.number:SetText(DuelView.Number(game))
    end
    widgets.status:SetText(DuelView.Status(game))
    widgets.history:SetText(DuelView.History(game) .. "\n" .. DuelView.Bets(game))
    drawnBetting = Rules.Betting(game)
    local roller, high = Rules.Turn(game)
    widgets.roll:SetShown(roller == me and not Rules.Betting(game) and animation == nil)
    widgets.roll.label:SetText(("Roll (%d-%d)"):format(Rules.LOSING_ROLL, high or Rules.LOSING_ROLL))
    local betting = Rules.Betting(game) and me ~= game.challenger and me ~= game.challenged
    for _, widget in ipairs({ widgets.amountHolder, widgets.betLeft, widgets.betRight }) do
        widget:SetShown(betting)
    end
    widgets.betLeft.label:SetText("Miser sur " .. game.challenged)
    widgets.betRight.label:SetText("Miser sur " .. game.challenger)
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
        widgets.number:SetText(math.random(Rules.LOSING_ROLL, animation.high))
        animation.next = now + FIRST_STEP + (LAST_STEP - FIRST_STEP) * progress * progress
    end
end

local function bet(choice)
    local refusal = Duels.Bet(shownId, choice(Games.Find(shownId)), widgets.amount:GetText())
    widgets.feedback:SetText(refusal or "Mise annoncée à la guilde.")
end

local function create()
    frame, body = VXV.CreateDialog("VXV_DuelWindow", WIDTH, HEIGHT, "Deathroll")
    widgets.background = body:CreateTexture(nil, "BACKGROUND")
    widgets.background:SetAllPoints()
    widgets.left = Theme.Text(body, "pixelBold", 16, "ivory")
    widgets.left:SetPoint("TOPLEFT", PADDING, -NAME_TOP)
    widgets.leftTitles = Theme.Text(body, "text", 11, "sakura-light")
    widgets.leftTitles:SetPoint("TOPLEFT", widgets.left, "BOTTOMLEFT", 0, -TITLES_GAP)
    widgets.right = Theme.Text(body, "pixelBold", 16, "ivory")
    widgets.right:SetPoint("TOPRIGHT", -PADDING, -NAME_TOP)
    widgets.rightTitles = Theme.Text(body, "text", 11, "sakura-light")
    widgets.rightTitles:SetPoint("TOPRIGHT", widgets.right, "BOTTOMRIGHT", 0, -TITLES_GAP)
    local versus = Theme.Text(body, "pixel", 14, "gold")
    versus:SetPoint("TOP", 0, -NAME_TOP)
    versus:SetText("contre")
    widgets.number = Theme.Text(body, "pixelBold", NUMBER_SIZE, "ivory")
    widgets.number:SetPoint("CENTER", 0, 40)
    widgets.status = Theme.Text(body, "text", 13, "ivory")
    widgets.status:SetPoint("TOP", widgets.number, "BOTTOM", 0, -12)
    widgets.history = Theme.Text(body, "text", 12, "lavender")
    widgets.history:SetPoint("TOP", widgets.status, "BOTTOM", 0, -10)
    widgets.roll = Theme.Button(body, "gold", "Roll", BUTTON_WIDTH, BUTTON_HEIGHT)
    widgets.roll:SetPoint("BOTTOM", 0, PADDING)
    widgets.roll:SetScript("OnClick", function()
        Duels.Roll(shownId)
    end)
    widgets.amountHolder, widgets.amount = Theme.Field(body, AMOUNT_WIDTH, AMOUNT_LETTERS)
    widgets.amountHolder:SetPoint("BOTTOM", 0, PADDING + BET_HEIGHT + PADDING)
    widgets.betLeft = Theme.Button(body, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betLeft:SetPoint("BOTTOMRIGHT", body, "BOTTOM", -PADDING / 2, PADDING)
    widgets.betLeft:SetScript("OnClick", function()
        bet(function(game)
            return game.challenged
        end)
    end)
    widgets.betRight = Theme.Button(body, "pixel", "Miser", BET_WIDTH, BET_HEIGHT)
    widgets.betRight:SetPoint("BOTTOMLEFT", body, "BOTTOM", PADDING / 2, PADDING)
    widgets.betRight:SetScript("OnClick", function()
        bet(function(game)
            return game.challenger
        end)
    end)
    widgets.feedback = Theme.Text(body, "text", 11, "muted")
    widgets.feedback:SetPoint("BOTTOM", widgets.amountHolder, "TOP", 0, 4)
    frame:SetScript("OnUpdate", function()
        animate()
        local game = shownId and Games.Find(shownId)
        if game == nil then
            return
        end
        if Rules.Betting(game) ~= drawnBetting then
            render()
        elseif drawnBetting then
            widgets.status:SetText(DuelView.Status(game))
        end
    end)
end

--- Opens the window on a game: its players, its watchers.
function DuelWindow.Show(id)
    if frame == nil then
        create()
    end
    shownId, animation = id, nil
    widgets.feedback:SetText("")
    render()
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

-- The players see their game at once.
VXV.On("deathroll.started", function(id)
    local game, me = Games.Find(id), VXV.PlayerName()
    if game ~= nil and (me == game.challenger or me == game.challenged) then
        DuelWindow.Show(id)
    else
        VXV.Print(("Deathroll : %s contre %s. Suis-le dans Le Dé Pipé › Deathroll."):format(game.challenger,
            game.challenged))
    end
end)

VXV.On("deathroll.updated", render)
