local ns = select(2, ...).Chifoumi

--- Le Dé Pipé's Chi Fou Mi tab: challenge a member connected with VXV for a stake (0 included), watch and bet on the
--- games being played, the player's debts (the winner confirms the payment here), and the latest games (the ranking
--- is in Ranking).
local ChifoumiTab = {}
ns.ChifoumiTab = ChifoumiTab

local ChifoumiData, Matches, MatchWindow, Games = ns.ChifoumiData, ns.Matches, ns.MatchWindow, ns.Games
local MatchView, Rights = ns.MatchView, ns.Rights

local Gold, RowList, Screen, Theme = VXV.Gold, VXV.RowList, VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local LEFT = 340
local FIELD_WIDTH, FIELD_LETTERS = 110, 7
local BUTTON_HEIGHT = 30
-- Under the list of members: the stake, the button and the answer.
local FORM_HEIGHT = 112
local TOP_SHARE = 0.5

local content
local lists, form = {}, {}
local target

local row = VXV.RowList.Row

--- The members connected with VXV the player may challenge, the one chosen marked.
local function members()
    local rows, me = {}, VXV.PlayerName()
    for _, name in ipairs(VXV.Online()) do
        if name ~= me then
            rows[#rows + 1] = row("line", (name == target and "▸ " or "") .. name, { onClick = function()
                target = name
                lists.members.SetRows(members())
            end })
        end
    end
    return #rows > 0 and rows or { row("line", "Aucun autre membre connecté avec VXV.") }
end

--- The games being played: a click opens the game's window, to watch it and bet.
local function live()
    local rows = {}
    for _, game in ipairs(Games.Live()) do
        rows[#rows + 1] = row("line", ("%s contre %s · %d – %d · %s"):format(game.challenged, game.challenger,
            MatchView.RoundsWon(game, game.challenged), MatchView.RoundsWon(game, game.challenger),
            Gold.Format(game.stake)), { onClick = function()
            MatchWindow.Show(game.id)
        end })
    end
    return #rows > 0 and rows or { row("line", "Aucune partie en cours.") }
end

local function debts()
    local rows, me = {}, VXV.PlayerName()
    for _, game in ipairs(Rights.Unpaid()) do
        if game.loser == me then
            rows[#rows + 1] = row("line", ("Tu dois %s à %s."):format(Gold.Format(game.stake), game.winner))
        elseif game.winner == me then
            rows[#rows + 1] = row("line", ("%s te doit %s : clique une fois payé."):format(game.loser,
                Gold.Format(game.stake)), { onClick = function()
                Matches.ConfirmPaid(game.id)
            end })
        end
    end
    return #rows > 0 and rows or { row("line", "Aucune dette de Chi Fou Mi.") }
end

--- The latest games over, as the website exports them: the winner, the loser and the stake.
local function latest()
    local data, rows = ChifoumiData.Current(), {}
    for _, game in ipairs(data and data.latest or {}) do
        rows[#rows + 1] = row("line", ("%s bat %s · %s"):format(game.winner, game.loser, Gold.Format(game.stake)))
    end
    return #rows > 0 and rows or { row("line", "Les dernières parties arrivent avec les données du site.") }
end

local function render()
    lists.members.SetRows(members())
    lists.live.SetRows(live())
    lists.debts.SetRows(debts())
    lists.latest.SetRows(latest())
end

local function challenge()
    local refusal = Matches.Challenge(target, form.stake:GetText())
    form.answer:SetText(refusal or ("Défi envoyé à %s : une minute pour répondre."):format(target))
end

--- The challenge's panel: the members to choose from, then the stake and the button.
local function addChallenge(height)
    local _, body = Theme.TitledPanel(content, PADDING, GRID_TOP, LEFT, height, "Défier un membre")
    lists.members = RowList.Create(body, 0, nil, FORM_HEIGHT)
    local stakeLabel = Theme.Heading(body, "Mise (po, 0 possible)")
    stakeLabel:SetPoint("BOTTOMLEFT", 0, FORM_HEIGHT - 20)
    local stakeHolder
    stakeHolder, form.stake = Theme.Field(body, FIELD_WIDTH, FIELD_LETTERS)
    stakeHolder:SetPoint("TOPLEFT", stakeLabel, "BOTTOMLEFT", 0, -4)
    form.stake:SetText("0")
    local button = Theme.Button(body, "gold", "Défier", body:GetWidth(), BUTTON_HEIGHT)
    button:SetPoint("BOTTOMLEFT", 0, 18)
    button:SetScript("OnClick", challenge)
    form.answer = Theme.Text(body, "text", 11, "muted")
    form.answer:SetPoint("BOTTOMLEFT")
end

function ChifoumiTab.Build(frame)
    content = frame
    Screen.Head(content, "La salle de jeu", "neon", "Chi Fou Mi").subtitle:SetText(
        "Pierre, feuille, ciseaux au meilleur des trois manches ; une égalité se rejoue.")
    local height = content:GetHeight() - GRID_TOP - PADDING
    local topHeight = math.floor(height * TOP_SHARE)
    addChallenge(topHeight)
    lists.debts = RowList.Panel(content, PADDING, GRID_TOP + topHeight + GAP, LEFT, height - topHeight - GAP,
        "Mes dettes")
    local x, width = PADDING + LEFT + GAP, content:GetWidth() - 2 * PADDING - LEFT - GAP
    lists.live = RowList.Panel(content, x, GRID_TOP, width, topHeight, "Parties en cours")
    lists.latest = RowList.Panel(content, x, GRID_TOP + topHeight + GAP, width, height - topHeight - GAP,
        "Dernières parties")
    Screen.Follow(content, render, { "chifoumi.updated", "presence.changed" })
end
