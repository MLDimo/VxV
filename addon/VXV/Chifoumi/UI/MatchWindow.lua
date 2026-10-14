local ns = select(2, ...).Chifoumi

--- The game's window: the two players with their titles, the score, the round being played with the three moves for
--- its players, the stakes during the minute of bets, the rounds so far. It opens for the players once their fight is
--- over; the other members open it from the Chi Fou Mi tab to watch and bet (no window comes to them on its own).
local MatchWindow = {}
ns.MatchWindow = MatchWindow

local Games, Matches, MatchView, Rules = ns.Games, ns.Matches, ns.MatchView, ns.Rules

local Theme = VXV.Theme

local WIDTH, HEIGHT = 460, 400
local PADDING = 8
local NAME_TOP, TITLES_GAP = 4, 4
local SCORE_SIZE = 48
local MOVE_WIDTH, MOVE_HEIGHT, MOVE_GAP = 130, 34, 8
local BET_WIDTH, BET_HEIGHT, AMOUNT_WIDTH, AMOUNT_LETTERS = 150, 28, 90, 7
-- How often the window redraws during the minute of bets: its countdown.
local REDRAW_SECONDS = 1

local frame, body, shownId, redrawAt
local widgets = {}

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

local function render()
    local game = shownId and Games.Find(shownId)
    if not game or frame == nil then
        return
    end
    local me = VXV.PlayerName()
    -- The challenged on the left, as the score reads.
    widgets.left:SetText(VXV.ClassColored(game.challenged, classOf(game.challenged)))
    widgets.leftTitles:SetText(titlesOf(game.challenged))
    widgets.right:SetText(VXV.ClassColored(game.challenger, classOf(game.challenger)))
    widgets.rightTitles:SetText(titlesOf(game.challenger))
    widgets.score:SetText(MatchView.Score(game))
    widgets.status:SetText(MatchView.Status(game, me))
    widgets.history:SetText(MatchView.History(game) .. "\n" .. MatchView.Bets(game))
    local canPlay = MatchView.CanPlay(game, me)
    for _, move in ipairs(Rules.MOVES) do
        widgets[move]:SetShown(canPlay)
    end
    local betting = Rules.Betting(game) and me ~= game.challenger and me ~= game.challenged
    for _, widget in ipairs({ widgets.amountHolder, widgets.betLeft, widgets.betRight }) do
        widget:SetShown(betting)
    end
    widgets.betLeft.label:SetText("Miser sur " .. game.challenged)
    widgets.betRight.label:SetText("Miser sur " .. game.challenger)
end

local function bet(choice)
    local refusal = Matches.Bet(shownId, choice(Games.Find(shownId)), widgets.amount:GetText())
    widgets.feedback:SetText(refusal or "Mise annoncée à la guilde.")
end

local function create()
    frame, body = VXV.CreateDialog("VXV_ChifoumiWindow", WIDTH, HEIGHT, "Chi Fou Mi")
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
    widgets.score = Theme.Text(body, "pixelBold", SCORE_SIZE, "ivory")
    widgets.score:SetPoint("CENTER", 0, 60)
    widgets.status = Theme.Text(body, "text", 13, "ivory")
    widgets.status:SetPoint("TOP", widgets.score, "BOTTOM", 0, -12)
    widgets.history = Theme.Text(body, "text", 12, "lavender")
    widgets.history:SetPoint("TOP", widgets.status, "BOTTOM", 0, -10)
    local x = -(#Rules.MOVES * MOVE_WIDTH + (#Rules.MOVES - 1) * MOVE_GAP) / 2
    for _, move in ipairs(Rules.MOVES) do
        local button = Theme.Button(body, "gold", Rules.MOVE_NAMES[move], MOVE_WIDTH, MOVE_HEIGHT)
        button:SetPoint("BOTTOMLEFT", body, "BOTTOM", x, PADDING)
        button:SetScript("OnClick", function()
            Matches.Play(shownId, move)
        end)
        widgets[move] = button
        x = x + MOVE_WIDTH + MOVE_GAP
    end
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
    -- The countdown of the bets, then the first round's buttons when it ends.
    frame:SetScript("OnUpdate", function()
        local game = shownId and Games.Find(shownId)
        if game ~= nil and Games.IsLive(game) and GetTime() >= (redrawAt or 0) then
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
